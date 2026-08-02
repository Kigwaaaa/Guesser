"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

export default function JoinPage() {
	const router = useRouter();
	const [code, setCode] = useState("");
	const [name, setName] = useState("");
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleJoin(e?: React.FormEvent) {
		e?.preventDefault();
		setError(null);
		if (!code || !name) return setError("Please enter both the room code and your name.");
		setLoading(true);

		// Validate room exists and is joinable
		const { data: room, error: roomErr } = await supabase
			.from("rooms")
			.select("code,target_player_count,status")
			.eq("code", code)
			.maybeSingle();

		if (roomErr) {
			setLoading(false);
			return setError("Failed to check room: " + roomErr.message);
		}
		if (!room) {
			setLoading(false);
			return setError("Room not found.");
		}
		if (room.status !== "waiting") {
			setLoading(false);
			return setError("The game has already started or finished and cannot be joined.");
		}

		// Count current players
		const { count, error: countErr } = await supabase
			.from("players")
			.select("id", { count: "exact", head: true })
			.eq("room_code", code);

		if (countErr) {
			setLoading(false);
			return setError("Failed to count players: " + countErr.message);
		}

		const current = count ?? 0;
		if (current >= room.target_player_count) {
			setLoading(false);
			return setError("This room is already full.");
		}

		// Insert player with next turn index and capture id
		const nextIndex = current; // zero-based
		const { data: playerData, error: insErr } = await supabase
			.from("players")
			.insert({ room_code: code, name, turn_order_index: nextIndex })
			.select()
			.maybeSingle();

		setLoading(false);
		if (insErr || !playerData) return setError("Failed to join room: " + (insErr?.message ?? "unknown"));

		try {
			sessionStorage.setItem("player_id", playerData.id);
		} catch (e) {
			console.warn("sessionStorage unavailable", e);
		}

		router.push(`/room/${code}`);
	}

	return (
		<main className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
			<div className="max-w-md w-full">
				<h2 className="text-2xl font-semibold mb-4">Join a room</h2>

				<form onSubmit={handleJoin} className="space-y-4">
					<div>
						<label className="block text-sm font-medium mb-1">Room code</label>
						<input
							value={code}
							onChange={(e) => setCode(e.target.value.toUpperCase())}
							className="w-full px-3 py-2 rounded-md bg-gray-900 border border-gray-700"
							placeholder="ABCD"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium mb-1">Your name</label>
						<input
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="w-full px-3 py-2 rounded-md bg-gray-900 border border-gray-700"
							placeholder="e.g. Sam"
						/>
					</div>

					{error && <div className="text-sm text-red-400">{error}</div>}

					<div>
						<button type="submit" disabled={loading} className="px-4 py-2 rounded-md bg-[#7C3AED] text-black">
							{loading ? "Joining…" : "Join Room"}
						</button>
					</div>
				</form>
			</div>
		</main>
	);
}