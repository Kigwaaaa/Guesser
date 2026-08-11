"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import PlayerCard from "../../../../components/PlayerCard";
import UnmaskAnimation from "../../../../components/UnmaskAnimation";
import { startGuess as egStartGuess, confirmReveal as egConfirmReveal } from "../../../../lib/gameEngine";

import { parseThemeItemEmbed, type ThemeItemSummary } from "../../../../lib/types";

type Player = {
  id: string;
  name: string;
  turn_order_index: number;
  is_eliminated?: boolean;
  rank?: number | null;
};

type AssignmentInfo = {
  player_id: string;
  theme_items?: ThemeItemSummary | ThemeItemSummary[] | null;
};

function assignmentFromRow(row: AssignmentInfo): { name: string; image_url: string | null } | null {
  const item = parseThemeItemEmbed(row.theme_items);
  if (!row.player_id || !item?.name) return null;
  return { name: item.name, image_url: item.image_url };
}

type RoomStatusRow = {
  current_turn_index?: number | null;
  pending_guess_player_id?: string | null;
  status?: string | null;
};

type RevealConfirmationRow = {
  guesser_player_id: string;
  confirming_player_id: string;
};

export default function GameScreen() {
  const params = useParams();
  const code = params?.code as string;
  const [players, setPlayers] = useState<Player[]>([]);
  const [assignments, setAssignments] = useState<Record<string, { name: string; image_url?: string | null }>>({});
  const assignmentsRef = useRef(assignments);
  const [currentTurn, setCurrentTurn] = useState<number | null>(null);
  const [pendingGuesserId, setPendingGuesserId] = useState<string | null>(null);
  const [confirmations, setConfirmations] = useState<Record<string, string[]>>({});
  const [roomStatus, setRoomStatus] = useState<string | null>(null);

  // unmask animation trigger state
  const [unmask, setUnmask] = useState<null | { playerId: string; name?: string; image_url?: string | null; rank?: number | null; key: number }>(null);
  const unmaskKeyRef = useRef(0);

  useEffect(() => {
    assignmentsRef.current = assignments;
  }, [assignments]);

  useEffect(() => {
    if (!code) return;
    let mounted = true;

    async function load() {
      const { data: pl, error: plErr } = await supabase
        .from("players")
        .select("id,name,turn_order_index,is_eliminated,rank")
        .eq("room_code", code)
        .order("turn_order_index", { ascending: true });
      if (plErr) return console.error(plErr);
      const playerList = (pl ?? []) as Player[];
      if (mounted) setPlayers(playerList);

      const playerIds = playerList.map((p) => p.id);
      const map: Record<string, { name: string; image_url: string | null }> = {};

      if (playerIds.length > 0) {
        const { data: asg, error: asgErr } = await supabase
          .from("player_assignments")
          .select("player_id,theme_items(id,name,image_url)")
          .in("player_id", playerIds);
        if (asgErr) {
          console.error("[game] failed to load assignments", asgErr);
        } else {
          ((asg ?? []) as AssignmentInfo[]).forEach((r) => {
            const parsed = assignmentFromRow(r);
            if (parsed) map[r.player_id] = parsed;
          });
        }
      }

      if (mounted) setAssignments(map);

      const { data: room, error: roomErr } = await supabase.from("rooms").select("current_turn_index,pending_guess_player_id,status").eq("code", code).maybeSingle();
      if (roomErr) return console.error(roomErr);
      if (mounted) {
        setCurrentTurn(room?.current_turn_index ?? null);
        setPendingGuesserId(room?.pending_guess_player_id ?? null);
        setRoomStatus(room?.status ?? null);
      }

      const { data: revData } = await supabase
        .from("reveal_confirmations")
        .select("guesser_player_id,confirming_player_id")
        .eq("room_code", code);
      const revMap: Record<string, string[]> = {};
      ((revData ?? []) as RevealConfirmationRow[]).forEach((r) => {
        revMap[r.guesser_player_id] = revMap[r.guesser_player_id] || [];
        revMap[r.guesser_player_id].push(r.confirming_player_id);
      });
      if (mounted) setConfirmations(revMap);
    }

    load();

    // subscribe players
    const plChannel = supabase.channel(`game_players_${code}`);
    plChannel.on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `room_code=eq.${code}` }, (payload: unknown) => {
        const incoming = payload as { eventType: string; new: Player | null; old: Player | null };
        const ev = incoming.eventType;
        const newRow = incoming.new;
        const oldRow = incoming.old;

        // detect elimination event (transition false -> true)
        if (ev === "UPDATE" && newRow && newRow.is_eliminated && (!oldRow || !oldRow.is_eliminated)) {
          // fetch assignment name/url if available
          const a = assignmentsRef.current[newRow.id];
          unmaskKeyRef.current += 1;
          setUnmask({ playerId: newRow.id, name: a?.name, image_url: a?.image_url, rank: newRow.rank ?? null, key: unmaskKeyRef.current });
        }

        setPlayers((prev) => {
          let next = [...prev];
          if (ev === "INSERT" && newRow) {
            next.push(newRow);
            next.sort((a, b) => a.turn_order_index - b.turn_order_index);
          } else if (ev === "UPDATE" && newRow) {
            next = next.map((p) => (p.id === newRow.id ? newRow : p));
            next.sort((a, b) => a.turn_order_index - b.turn_order_index);
          } else if (ev === "DELETE" && oldRow) {
            next = next.filter((p) => p.id !== oldRow.id);
          }
          return next;
        });
      })
      .subscribe();

    // assignments subscription
    const asgChannel = supabase.channel(`game_assignments_${code}`);
    asgChannel.on("postgres_changes", { event: "*", schema: "public", table: "player_assignments" }, (payload: unknown) => {
        const incoming = payload as { eventType: string; new: { player_id: string; theme_item_id: string } | null; old: { player_id: string; theme_item_id: string } | null };
        const ev = incoming.eventType;
        const newRow = incoming.new;
        const oldRow = incoming.old;
        setAssignments((prev) => {
          const next = { ...prev };
          if (ev === "INSERT" && newRow) {
            supabase.from("theme_items").select("id,name,image_url").eq("id", newRow.theme_item_id).maybeSingle().then(({ data }) => {
              if (data) setAssignments((p) => ({ ...p, [newRow.player_id]: { name: data.name, image_url: data.image_url } }));
            });
          } else if (ev === "UPDATE" && newRow) {
            supabase.from("theme_items").select("id,name,image_url").eq("id", newRow.theme_item_id).maybeSingle().then(({ data }) => {
              if (data) setAssignments((p) => ({ ...p, [newRow.player_id]: { name: data.name, image_url: data.image_url } }));
            });
          } else if (ev === "DELETE" && oldRow) {
            delete next[oldRow.player_id];
          }
          return next;
        });
      })
      .subscribe();

    // rooms subscription
    const roomChannel = supabase.channel(`game_room_${code}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `code=eq.${code}` }, (payload: unknown) => {
        const incoming = payload as { new: RoomStatusRow | null };
        const newRow = incoming.new;
        if (newRow && typeof newRow.current_turn_index === "number") setCurrentTurn(newRow.current_turn_index);
        if (newRow) {
          setPendingGuesserId(newRow.pending_guess_player_id ?? null);
          if (newRow.status) setRoomStatus(newRow.status);
        }
      })
      .subscribe();

    // reveal confirmations
    const revChannel = supabase.channel(`game_reveals_${code}`);
    revChannel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "reveal_confirmations", filter: `room_code=eq.${code}` },
      () => {
          supabase
            .from("reveal_confirmations")
            .select("guesser_player_id,confirming_player_id")
            .eq("room_code", code)
            .then(({ data }) => {
              const map: Record<string, string[]> = {};
              ((data ?? []) as RevealConfirmationRow[]).forEach((r) => {
                map[r.guesser_player_id] = map[r.guesser_player_id] || [];
                map[r.guesser_player_id].push(r.confirming_player_id);
              });
              setConfirmations(map);
            });
        }
      )
      .subscribe();

    return () => {
      try {
        plChannel.unsubscribe();
        asgChannel.unsubscribe();
        roomChannel.unsubscribe();
        revChannel.unsubscribe();
      } catch {
        // ignore
      }
      mounted = false;
    };
  }, [code]);

  const selfId = typeof window !== "undefined" ? sessionStorage.getItem("player_id") : null;

  const onStartGuess = async () => {
    if (!code || !selfId) return;
    const res = await egStartGuess(code, selfId);
    if (!res.success) console.error(res.message);
  };

  const onConfirmReveal = async (guesserId: string) => {
    if (!code || !selfId) return;
    const res = await egConfirmReveal(code, guesserId, selfId);
    if (!res.success) console.error(res.message);
  };

  // handle animation finished
  const onUnmaskFinished = () => setUnmask(null);

  if (roomStatus === "finished") {
    // show final ranking screen
    const ranked = [...players].filter((p) => p.rank).sort((a, b) => (a.rank ?? 999) - (b.rank ?? 999));
    return (
      <main className="min-h-screen p-6 bg-background text-foreground">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4">Game Over — Final Rankings</h2>
          <ol className="space-y-3 text-left">
            {ranked.map((p) => (
              <li key={p.id} className="p-3 rounded-lg bg-gray-900 flex items-center justify-between">
                <div>
                  <div className="font-semibold">{p.name}</div>
                  <div className="text-sm text-gray-400">Seat #{p.turn_order_index + 1}</div>
                </div>
                <div className="text-2xl font-bold">#{p.rank}</div>
              </li>
            ))}
          </ol>
        </div>
      </main>
    );
  }

  const playerCount = players.length;
  const gridClass =
    playerCount <= 1
      ? "grid-cols-1 grid-rows-1"
      : playerCount === 2
        ? "grid-cols-1 grid-rows-2 sm:grid-cols-2 sm:grid-rows-1"
        : playerCount === 3
          ? "grid-cols-2 grid-rows-2 [&>*:last-child]:col-span-2 sm:[&>*:last-child]:col-span-1 sm:grid-cols-3 sm:grid-rows-1"
          : "grid-cols-2 grid-rows-2";

  return (
    <main className="flex h-[100dvh] flex-col overflow-hidden bg-background p-3 text-foreground sm:p-4 md:p-6">
      <div className="mx-auto flex h-full w-full max-w-7xl min-h-0 flex-col">
        <header className="mb-3 flex shrink-0 items-center justify-between gap-3 sm:mb-4">
          <h2 className="text-lg font-semibold sm:text-2xl">Game — Room {code}</h2>
          <span className="text-xs text-gray-400 sm:text-sm">{playerCount} players</span>
        </header>

        <div className={`grid min-h-0 flex-1 gap-3 sm:gap-4 ${gridClass}`}>
          {players.map((p) => {
            const isSelf = p.id === selfId;
            const isGuesser = pendingGuesserId === p.id;
            const canGuess = isSelf && currentTurn === p.turn_order_index && !pendingGuesserId;

            return (
              <div key={p.id} className="min-h-0">
                <PlayerCard
                  player={p}
                  assignment={isSelf ? undefined : assignments[p.id] ?? null}
                  isSelf={isSelf}
                  isActiveTurn={currentTurn === p.turn_order_index}
                  isPendingGuesser={isGuesser}
                  action={
                    canGuess ? (
                      <button
                        type="button"
                        className="rounded-lg bg-[#7C3AED] px-3 py-2 text-sm font-semibold text-black transition hover:bg-violet-400"
                        onClick={onStartGuess}
                      >
                        I&apos;m guessing now
                      </button>
                    ) : null
                  }
                />
              </div>
            );
          })}
        </div>

        {pendingGuesserId && selfId && selfId !== pendingGuesserId ? (
          (() => {
            const selfPlayer = players.find((x) => x.id === selfId);
            const isElim = selfPlayer?.is_eliminated;
            if (isElim) return null;
            const hasConfirmed = confirmations[pendingGuesserId]?.includes(selfId) ?? false;
            return (
              <div className="mt-3 shrink-0 rounded-xl border border-white/10 bg-white/5 p-3 sm:mt-4 sm:p-4">
                <div className="mb-2 text-sm sm:text-base">Player is guessing — confirm to reveal:</div>
                <button
                  type="button"
                  className={`rounded-lg px-4 py-2 text-sm font-semibold ${hasConfirmed ? "bg-gray-800 text-gray-400" : "bg-[#7C3AED] text-black"}`}
                  onClick={() => onConfirmReveal(pendingGuesserId as string)}
                  disabled={hasConfirmed}
                >
                  {hasConfirmed ? "Confirmed" : "Reveal"}
                </button>
              </div>
            );
          })()
        ) : null}

        {unmask ? (
          <UnmaskAnimation playerName={unmask.name ?? "Player"} imageUrl={unmask.image_url} rank={unmask.rank ?? null} onFinished={onUnmaskFinished} playKey={unmask.key} />
        ) : null}
      </div>
    </main>
  );
}
