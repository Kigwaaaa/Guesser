"use client";

import React, { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../../lib/supabaseClient";
import PlayerCard from "../../../../components/PlayerCard";
import UnmaskAnimation from "../../../../components/UnmaskAnimation";
import { startGuess as egStartGuess, confirmReveal as egConfirmReveal } from "../../../../lib/gameEngine";

type Player = {
  id: string;
  name: string;
  turn_order_index: number;
  is_eliminated?: boolean;
  rank?: number | null;
};

export default function GameScreen() {
  const params = useParams();
  const code = params?.code as string;
  const [players, setPlayers] = useState<Player[]>([]);
  const [assignments, setAssignments] = useState<Record<string, { name: string; image_url?: string | null }>>({});
  const [currentTurn, setCurrentTurn] = useState<number | null>(null);
  const [pendingGuesserId, setPendingGuesserId] = useState<string | null>(null);
  const [confirmations, setConfirmations] = useState<Record<string, string[]>>({});
  const [roomStatus, setRoomStatus] = useState<string | null>(null);

  // unmask animation trigger state
  const [unmask, setUnmask] = useState<null | { playerId: string; name?: string; image_url?: string | null; rank?: number | null; key: number }>(null);
  const unmaskKeyRef = useRef(0);

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
      if (mounted) setPlayers(pl as any);

      const { data: asg, error: asgErr } = await supabase.from("player_assignments").select("player_id,theme_items(id,name,image_url)");
      if (asgErr) return console.error(asgErr);
      const map: Record<string, { name: string; image_url?: string | null }> = {};
      (asg || []).forEach((r: any) => {
        if (r.player_id && r.theme_items) map[r.player_id] = { name: r.theme_items.name, image_url: r.theme_items.image_url };
      });
      if (mounted) setAssignments(map);

      const { data: room, error: roomErr } = await supabase.from("rooms").select("current_turn_index,pending_guess_player_id,status").eq("code", code).maybeSingle();
      if (roomErr) return console.error(roomErr);
      if (mounted) {
        setCurrentTurn(room?.current_turn_index ?? null);
        setPendingGuesserId(room?.pending_guess_player_id ?? null);
        setRoomStatus(room?.status ?? null);
      }

      const { data: revData } = await supabase.from("reveal_confirmations").select("guesser_player_id,confirming_player_id").eq("room_code", code);
      const revMap: Record<string, string[]> = {};
      (revData || []).forEach((r: any) => {
        revMap[r.guesser_player_id] = revMap[r.guesser_player_id] || [];
        revMap[r.guesser_player_id].push(r.confirming_player_id);
      });
      if (mounted) setConfirmations(revMap);
    }

    load();

    // subscribe players
    const plChannel = supabase
      .channel(`game_players_${code}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `room_code=eq.${code}` }, (payload) => {
        const ev = payload.eventType;
        const newRow = payload.new as Player | null;
        const oldRow = payload.old as Player | null;

        // detect elimination event (transition false -> true)
        if (ev === "UPDATE" && newRow && newRow.is_eliminated && (!oldRow || !oldRow.is_eliminated)) {
          // fetch assignment name/url if available
          const a = assignments[newRow.id];
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
    const asgChannel = supabase
      .channel(`game_assignments_${code}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "player_assignments" }, (payload) => {
        const ev = payload.eventType;
        const newRow = payload.new as any | null;
        const oldRow = payload.old as any | null;
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
    const roomChannel = supabase
      .channel(`game_room_${code}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "rooms", filter: `code=eq.${code}` }, (payload) => {
        const newRow = payload.new as any | null;
        if (newRow && typeof newRow.current_turn_index === "number") setCurrentTurn(newRow.current_turn_index);
        if (newRow) {
          setPendingGuesserId(newRow.pending_guess_player_id ?? null);
          if (newRow.status) setRoomStatus(newRow.status);
        }
      })
      .subscribe();

    // reveal confirmations
    const revChannel = supabase
      .channel(`game_reveals_${code}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "reveal_confirmations", filter: `room_code=eq.${code}` },
        (payload) => {
          supabase
            .from("reveal_confirmations")
            .select("guesser_player_id,confirming_player_id")
            .eq("room_code", code)
            .then(({ data }) => {
              const map: Record<string, string[]> = {};
              (data || []).forEach((r: any) => {
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
      } catch (e) {
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

  return (
    <main className="min-h-screen p-6 bg-background text-foreground">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-semibold mb-4">Game — Room {code}</h2>

        <div className="grid grid-cols-2 gap-4">
          {players.map((p) => {
            const isSelf = p.id === selfId;
            const isGuesser = pendingGuesserId === p.id;
            return (
              <div key={p.id} className="relative">
                <PlayerCard
                  player={p}
                  assignment={isSelf ? undefined : assignments[p.id] ?? null}
                  isSelf={isSelf}
                  isActiveTurn={currentTurn === p.turn_order_index}
                  isPendingGuesser={isGuesser}
                />

                {/* Active player can start a guess when it's their turn and no pending guess exists */}
                {isSelf && currentTurn === p.turn_order_index && !pendingGuesserId ? (
                  <div className="mt-2">
                    <button className="btn btn-primary" onClick={onStartGuess}>
                      I'm guessing now
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Reveal confirmation UI shown once per client (for the current player) when someone else is guessing */}
        {pendingGuesserId && selfId && selfId !== pendingGuesserId ? (
          (() => {
            const selfPlayer = players.find((x) => x.id === selfId);
            const isElim = selfPlayer?.is_eliminated;
            if (isElim) return null;
            const hasConfirmed = confirmations[pendingGuesserId]?.includes(selfId) ?? false;
            return (
              <div className="mt-4">
                <div className="mb-2">Player is guessing — confirm to reveal:</div>
                <button className={`btn ${hasConfirmed ? "btn-disabled" : "btn-ghost"}`} onClick={() => onConfirmReveal(pendingGuesserId as string)} disabled={hasConfirmed}>
                  {hasConfirmed ? "Confirmed" : "Reveal"}
                </button>
              </div>
            );
          })()
        ) : null}

        {/* Unmask animation triggered globally when a player becomes eliminated */}
        {unmask ? (
          <UnmaskAnimation playerName={unmask.name ?? "Player"} imageUrl={unmask.image_url} rank={unmask.rank ?? null} onFinished={onUnmaskFinished} playKey={unmask.key} />
        ) : null}
      </div>
    </main>
  );
}
