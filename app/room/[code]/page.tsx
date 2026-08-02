"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "../../../lib/supabaseClient";

type Player = {
  id: string;
  name: string;
  turn_order_index: number;
  is_eliminated?: boolean;
  rank?: number | null;
};

export default function RoomLobby() {
  const params = useParams();
  const code = params?.code as string;
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    if (!code) return;

    let mounted = true;

    // load current players
    supabase
      .from("players")
      .select("id,name,turn_order_index,is_eliminated,rank")
      .eq("room_code", code)
      .order("turn_order_index", { ascending: true })
      .then(({ data, error }) => {
        if (!mounted) return;
        setLoading(false);
        if (error) return console.error(error);
        setPlayers(data as any);
      });

    // subscribe to realtime changes for players in this room
    const channel = supabase
      .channel(`room_players_${code}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "players", filter: `room_code=eq.${code}` },
        (payload) => {
          const ev = payload.eventType;
          const newRow = payload.new as Player | null;
          const oldRow = payload.old as Player | null;

          setPlayers((prev) => {
            let next = [...prev];
            if (ev === "INSERT" && newRow) {
              next.push(newRow);
              next.sort((a, b) => a.turn_order_index - b.turn_order_index);
            } else if (ev === "UPDATE" && newRow) {
              next = next.map((p) => (p.id === newRow.id ? newRow : p));
            } else if (ev === "DELETE" && oldRow) {
              next = next.filter((p) => p.id !== oldRow.id);
            }
            return next;
          });
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      try {
        channel.unsubscribe();
      } catch (e) {
        // ignore
      }
    };
  }, [code]);

  const hostId = (typeof window !== "undefined" && sessionStorage.getItem("player_id")) || null;
  const isHost = hostId && players.find((p) => p.turn_order_index === 0 && p.id === hostId);

  async function startGame() {
    if (!code) return;
    setStarting(true);
    const { error } = await supabase.from("rooms").update({ status: "playing" }).eq("code", code);
    setStarting(false);
    if (error) return console.error("Failed to start game", error);
  }

  return (
    <main className="min-h-screen p-6 bg-background text-foreground">
      <div className="max-w-3xl mx-auto">
        <h2 className="text-2xl font-semibold mb-4">Room {code}</h2>

        <div className="mb-4">
          <h3 className="font-medium">Players</h3>
          {loading && <div className="text-sm text-gray-400">Loading players…</div>}
          {!loading && players.length === 0 && <div className="text-sm text-gray-400">No players yet.</div>}

          <ul className="mt-2 space-y-2">
            {players.map((p) => (
              <li key={p.id} className="flex items-center justify-between p-3 bg-gray-900 rounded-md">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="text-xs text-gray-400">Seat #{p.turn_order_index + 1}</div>
                </div>
                <div className="text-sm text-gray-300">{p.is_eliminated ? "Eliminated" : "Active"}</div>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6">
          <button
            disabled={!isHost || players.length < 2 || starting}
            onClick={startGame}
            className={`px-4 py-2 rounded-md ${isHost ? "bg-[#7C3AED] text-black" : "bg-gray-800 text-gray-400"}`}
          >
            {starting ? "Starting…" : "Start Game"}
          </button>
          {!isHost && <div className="text-xs text-gray-400 mt-2">Only the host can start the game.</div>}
          {players.length < 2 && <div className="text-xs text-gray-400 mt-2">Need at least 2 players to start.</div>}
        </div>
      </div>
    </main>
  );
}
// Lobby placeholder for waiting for players to join a room.