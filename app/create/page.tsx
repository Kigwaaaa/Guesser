"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";
import ThemeSelector from "../../components/ThemeSelector";
import PlayerCountSelector from "../../components/PlayerCountSelector";

function generateCode(length = 4) {
	const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	let s = "";
	for (let i = 0; i < length; i++) s += chars[Math.floor(Math.random() * chars.length)];
	return s;
}

export default function CreatePage() {
	const router = useRouter();
	const [name, setName] = useState("");
	const [theme, setTheme] = useState<string | undefined>(undefined);
	const [count, setCount] = useState(3);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	async function handleCreate(e?: React.FormEvent) {
		e?.preventDefault();
		setError(null);
		if (!name || !theme) return setError("Please enter your name and choose a theme.");
		setLoading(true);

		// Try to create a unique room code, retrying on conflict a few times.
		let code = generateCode(4);
		for (let attempt = 0; attempt < 5; attempt++) {
			const { error: roomErr } = await supabase.from("rooms").insert({
				code,
				theme,
				target_player_count: count,
				status: "waiting",
			});

			if (!roomErr) break; // success

			// if conflict, generate a new code and retry
			console.warn("create room error, retrying", roomErr);
			code = generateCode(4);
			if (attempt === 4) {
				setLoading(false);
				return setError("Failed to create a unique room code, try again.");
			}
		}

		// insert host as player and capture the generated id
		const { data: playerData, error: playerErr } = await supabase
			.from("players")
			.insert({ room_code: code, name, turn_order_index: 0 })
			.select()
			.maybeSingle();

		setLoading(false);
		if (playerErr || !playerData) return setError("Failed to add host to players: " + (playerErr?.message ?? "unknown"));

		try {
			// persist current player id for lobby identification (session-only)
			sessionStorage.setItem("player_id", playerData.id);
		} catch (e) {
			// sessionStorage may be unavailable in some environments
			console.warn("sessionStorage unavailable", e);
		}

		router.push(`/room/${code}`);
	}

	return (
		<main className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
			<div className="max-w-xl w-full">
				<h2 className="text-2xl font-semibold mb-4">Create a room</h2>

				<form onSubmit={handleCreate} className="space-y-4">
					<div>
						<label className="block text-sm font-medium mb-1">Your name</label>
						<input
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="w-full px-3 py-2 rounded-md bg-gray-900 border border-gray-700"
							placeholder="e.g. Alex"
						/>
					</div>

					<ThemeSelector value={theme} onChange={(t) => setTheme(t)} />

					<PlayerCountSelector value={count} onChange={(n) => setCount(n)} />

					{error && <div className="text-sm text-red-400">{error}</div>}

					<div className="flex gap-2">
						<button
							type="submit"
							disabled={loading}
							className="px-4 py-2 rounded-md bg-[#7C3AED] text-black"
						>
							{loading ? "Creating…" : "Create Room"}
						</button>
					</div>
				</form>
			</div>
		</main>
	);
}