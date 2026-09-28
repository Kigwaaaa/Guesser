"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { checkRoomActionRateLimit } from "../../lib/roomRateLimit";
import ThemeSelector from "../../components/ThemeSelector";
import PlayerCountSelector from "../../components/PlayerCountSelector";

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

		const clientId = typeof window !== "undefined"
			? window.localStorage.getItem("guess-the-person:client-id") ?? "default"
			: "default";
		const rateLimit = checkRoomActionRateLimit("create-room", Date.now(), undefined, clientId);
		if (!rateLimit.allowed) {
			const seconds = Math.max(1, Math.ceil(rateLimit.retryAfterMs / 1000));
			setLoading(false);
			return setError(`Too many room creation attempts. Please wait ${seconds} seconds and try again.`);
		}

		setLoading(true);

		try {
			const response = await fetch("/api/rooms/create", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ name, theme, count }),
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) {
				throw new Error(payload?.error ?? "Failed to create room.");
			}

			if (payload.playerId) {
				try {
					sessionStorage.setItem("player_id", payload.playerId);
				} catch (error) {
					console.warn("sessionStorage unavailable", error);
				}
			}

			router.push(`/room/${payload.code}`);
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create room.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<main className="masquerade-shell text-foreground">
			<div className="max-w-xl w-full masquerade-panel rounded-[1.6rem] p-6 sm:p-8">
				<h2 className="text-3xl font-semibold mb-5" style={{ fontFamily: "var(--font-display)" }}>Create a room</h2>

				<form onSubmit={handleCreate} className="space-y-4">
					<div>
						<label className="block text-sm font-medium mb-2 muted-copy">Your name</label>
						<input
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="masquerade-input"
							placeholder="e.g. Alex"
						/>
					</div>

					<ThemeSelector value={theme} onChange={(t) => setTheme(t)} />

					<PlayerCountSelector value={count} onChange={(n) => setCount(n)} />

					{error && <div className="text-sm text-[#F5EFE3] opacity-80">{error}</div>}

					<div className="flex gap-2 pt-2">
						<button
							type="submit"
							disabled={loading}
							className="gold-button"
						>
							{loading ? "Creating…" : "Create Room"}
						</button>
					</div>
				</form>
			</div>
		</main>
	);
}