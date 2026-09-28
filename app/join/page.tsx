"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { checkRoomActionRateLimit } from "../../lib/roomRateLimit";

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

		const clientId = typeof window !== "undefined"
			? window.localStorage.getItem("guess-the-person:client-id") ?? "default"
			: "default";
		const rateLimit = checkRoomActionRateLimit("join-room", Date.now(), undefined, clientId);
		if (!rateLimit.allowed) {
			const seconds = Math.max(1, Math.ceil(rateLimit.retryAfterMs / 1000));
			setLoading(false);
			return setError(`Too many join attempts. Please wait ${seconds} seconds and try again.`);
		}

		setLoading(true);

		try {
			const response = await fetch("/api/rooms/join", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ code, name }),
			});
			const payload = await response.json().catch(() => ({}));

			if (!response.ok) {
				throw new Error(payload?.error ?? "Failed to join room.");
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
			setError(err instanceof Error ? err.message : "Failed to join room.");
		} finally {
			setLoading(false);
		}
	}

	return (
		<main className="masquerade-shell text-foreground">
			<div className="max-w-md w-full masquerade-panel rounded-[1.6rem] p-6 sm:p-8">
				<h2 className="text-3xl font-semibold mb-5" style={{ fontFamily: "var(--font-display)" }}>Join a room</h2>

				<form onSubmit={handleJoin} className="space-y-4">
					<div>
						<label className="block text-sm font-medium mb-2 muted-copy">Room code</label>
						<input
							value={code}
							onChange={(e) => setCode(e.target.value.toUpperCase())}
							className="masquerade-input"
							placeholder="ABCD"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium mb-2 muted-copy">Your name</label>
						<input
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="masquerade-input"
							placeholder="e.g. Sam"
						/>
					</div>

					{error && <div className="text-sm text-[#F5EFE3] opacity-80">{error}</div>}

					<div>
						<button type="submit" disabled={loading} className="ivory-button">
							{loading ? "Joining…" : "Join Room"}
						</button>
					</div>
				</form>
			</div>
		</main>
	);
}