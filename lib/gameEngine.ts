/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase } from "./supabaseClient";

/**
 * Start a game for the given room code:
 * 1. Load the room's theme and joined players (ordered by join time).
 * 2. Randomly assign each player a distinct `theme_item` from that theme.
 * 3. Upsert rows into `player_assignments` mapping player_id -> theme_item_id.
 * 4. Set each player's `turn_order_index` based on join order (0..n-1).
 * 5. Set `rooms.current_turn_index` to 0 so the first player starts.
 *
 * Returns an object with `success` and `message` when an error occurs.
 */
export async function startGame(roomCode: string, client: any = supabase): Promise<{ success: boolean; message?: string }> {
	if (!roomCode) return { success: false, message: "roomCode required" };

	// 1) load room to get the theme
	const { data: roomRows, error: roomErr } = await client
		.from("rooms")
		.select("theme")
		.eq("code", roomCode)
		.maybeSingle();

	if (roomErr) return { success: false, message: `failed to load room: ${roomErr.message}` };
	if (!roomRows) return { success: false, message: "room not found" };

	const theme = (roomRows as any).theme as string;

	// 2) load players ordered by joined_at (join order)
	const { data: players, error: playersErr } = await client
		.from("players")
		.select("id,joined_at,turn_order_index")
		.eq("room_code", roomCode)
		.order("joined_at", { ascending: true });

	if (playersErr) return { success: false, message: `failed to load players: ${playersErr.message}` };
	if (!players || players.length === 0) return { success: false, message: "no players in room" };

	// 3) load theme items for the room's theme
	const { data: items, error: itemsErr } = await client
		.from("theme_items")
		.select("id")
		.eq("theme", theme);

	if (itemsErr) return { success: false, message: `failed to load theme items: ${itemsErr.message}` };

	if (!items || items.length < players.length) {
		return { success: false, message: "not enough theme items to assign to players" };
	}

	// helper: shuffle and pick
	function shuffle<T>(arr: T[]) {
		for (let i = arr.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[arr[i], arr[j]] = [arr[j], arr[i]];
		}
		return arr;
	}

	const shuffled = shuffle(items.map((r: any) => r.id));
	const assignedIds = shuffled.slice(0, players.length);

	// prepare assignments: match players[i] -> assignedIds[i]
	const assignments = players.map((p: any, i: number) => ({ player_id: p.id, theme_item_id: assignedIds[i] }));

	// 4) upsert assignments (player_id is primary key)
	const { error: upsertErr } = await client.from("player_assignments").upsert(assignments, { onConflict: ["player_id"] });
	if (upsertErr) return { success: false, message: `failed to upsert assignments: ${upsertErr.message}` };

	// 5) update players' turn_order_index based on join order (0..n-1)
	for (let i = 0; i < players.length; i++) {
		const pid = (players[i] as any).id;
		const { error: updErr } = await client.from("players").update({ turn_order_index: i }).eq("id", pid);
		if (updErr) return { success: false, message: `failed to update player turn order: ${updErr.message}` };
	}

	// 6) set rooms.current_turn_index to 0
	const { error: roomUpdErr } = await client.from("rooms").update({ current_turn_index: 0 }).eq("code", roomCode);
	if (roomUpdErr) return { success: false, message: `failed to set current_turn_index: ${roomUpdErr.message}` };

	return { success: true };
}

/**
 * Mark a player as the current guesser for the room.
 */
export async function startGuess(roomCode: string, playerId: string, client: any = supabase) {
	if (!roomCode || !playerId) return { success: false, message: "roomCode and playerId required" };
	const { error } = await client.from("rooms").update({ pending_guess_player_id: playerId }).eq("code", roomCode);
	if (error) return { success: false, message: error.message };
	return { success: true };
}

/**
 * Confirm reveal for a guess attempt: insert confirming player into reveal_confirmations
 * and check whether all non-eliminated, non-guesser players have confirmed. If so, eliminate.
 */
export async function confirmReveal(roomCode: string, guesserPlayerId: string, confirmerPlayerId: string, client: any = supabase) {
	if (!roomCode || !guesserPlayerId || !confirmerPlayerId) return { success: false, message: "missing args" };

	const { error: insErr } = await client.from("reveal_confirmations").insert({ room_code: roomCode, guesser_player_id: guesserPlayerId, confirming_player_id: confirmerPlayerId });
	if (insErr) {
		// if duplicate confirmation (unique constraint), treat as success
		if ((insErr as any).code === "23505") {
			// continue
		} else {
			return { success: false, message: insErr.message };
		}
	}

	// count confirmations for this guess
	const { count: confirmCount, error: cntErr } = await client
		.from("reveal_confirmations")
		.select("confirming_player_id", { count: "exact", head: true })
		.eq("room_code", roomCode)
		.eq("guesser_player_id", guesserPlayerId);

	if (cntErr) return { success: false, message: cntErr.message };

	// count eligible players who must confirm: non-eliminated AND not the guesser
	const { count: eligibleCount, error: eligErr } = await client
		.from("players")
		.select("id", { count: "exact", head: true })
		.eq("room_code", roomCode)
		.eq("is_eliminated", false);

	if (eligErr) return { success: false, message: eligErr.message };

	const reqConfirmers = (eligibleCount ?? 0) - 1; // exclude the guesser

	if ((confirmCount ?? 0) >= reqConfirmers && reqConfirmers > 0) {
		// Everyone else has confirmed -> eliminate the guesser
		const elim = await eliminatePlayer(roomCode, guesserPlayerId, client);
		return elim;
	}

	return { success: true };
}

async function eliminatePlayer(roomCode: string, playerId: string, client: any = supabase) {
	// assign next rank: max existing rank + 1, or 1
	const { data: ranks, error: rankErr } = await client.from("players").select("rank").eq("room_code", roomCode);
	if (rankErr) return { success: false, message: rankErr.message };
	const maxRank = (ranks || []).reduce((m: number, r: any) => Math.max(m, r.rank ?? 0), 0);
	const newRank = maxRank + 1;

	const { error: updErr } = await client.from("players").update({ is_eliminated: true, rank: newRank }).eq("id", playerId);
	if (updErr) return { success: false, message: updErr.message };

	// clear pending guess and remove confirmations for that guess
	const { error: clearErr } = await client.from("rooms").update({ pending_guess_player_id: null }).eq("code", roomCode);
	if (clearErr) return { success: false, message: clearErr.message };

	const { error: delErr } = await client.from("reveal_confirmations").delete().eq("room_code", roomCode).eq("guesser_player_id", playerId);
	if (delErr) return { success: false, message: delErr.message };

	// Advance to the next non-eliminated player (or finish the room)
	const adv = await advanceTurn(roomCode, client);
	if (!adv.success) return { success: false, message: adv.message };

	return { success: true };
}

/**
 * Advance the room's `current_turn_index` to the next non-eliminated player.
 * Skips players who left the room (missing rows) and those marked `is_eliminated`.
 * If no active players remain, sets `rooms.status = 'finished'`.
 */
export async function advanceTurn(roomCode: string, client: any = supabase) {
	if (!roomCode) return { success: false, message: "roomCode required" };

	// load non-eliminated players ordered by turn_order_index
	const { data: activePlayers, error: apErr } = await client
		.from("players")
		.select("id,turn_order_index")
		.eq("room_code", roomCode)
		.eq("is_eliminated", false)
		.order("turn_order_index", { ascending: true });

	if (apErr) return { success: false, message: apErr.message };

	if (!activePlayers || activePlayers.length === 0) {
		// no active players -> finish the room
		const { error: finishErr } = await supabase.from("rooms").update({ status: "finished" }).eq("code", roomCode);
		if (finishErr) return { success: false, message: finishErr.message };
		return { success: true, finished: true } as any;
	}

	// read current turn index
	const { data: roomRow, error: roomErr } = await client.from("rooms").select("current_turn_index").eq("code", roomCode).maybeSingle();
	if (roomErr) return { success: false, message: roomErr.message };
	const cur = roomRow?.current_turn_index ?? null;

	// find position of current in activePlayers
	let pos = -1;
	if (cur !== null) pos = activePlayers.findIndex((p: any) => p.turn_order_index === cur);

	const nextPos = pos >= 0 ? (pos + 1) % activePlayers.length : 0;
	const nextTurnOrderIndex = activePlayers[nextPos].turn_order_index;

	const { error: updErr } = await supabase.from("rooms").update({ current_turn_index: nextTurnOrderIndex }).eq("code", roomCode);
	if (updErr) return { success: false, message: updErr.message };

	return { success: true, newTurn: nextTurnOrderIndex } as any;
}

/**
 * Public alias for advancing to the next turn. Call this when a turn completes
 * (whether the guess was correct or not).
 */
export async function endTurn(roomCode: string) {
	return advanceTurn(roomCode);
}
