"use client";

import React, { useEffect, useRef, useState } from "react";

// ExplainerCards
// - Shows a short, swipeable sequence of instruction cards (4 cards).
// - Automatically visible on first mount (per React state only; no localStorage).
// - Listens for a global `openExplainer` window event so a persistent
//   `?` button anywhere in the app can re-open it.

const CARDS = [
	{
		title: "You have a secret identity",
		body: "You'll be secretly assigned an identity that only other players can see.",
	},
	{
		title: "Others can see you",
		body: "Everyone else at the table can see your identity — you must deduce it.",
	},
	{
		title: "Ask one yes/no question",
		body: "On your turn, ask one yes/no question out loud to learn clues.",
	},
	{
		title: "Guess when ready",
		body: "When you think you know who you are, guess out loud. Others confirm to reveal.",
	},
];

export default function ExplainerCards(): JSX.Element {
	const [visible, setVisible] = useState(true); // auto-show on first mount
	const [index, setIndex] = useState(0);
	const startX = useRef<number | null>(null);
	const deltaX = useRef(0);
	const cardRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		const handler = () => setVisible(true);
		window.addEventListener("openExplainer", handler as EventListener);
		return () => window.removeEventListener("openExplainer", handler as EventListener);
	}, []);

	useEffect(() => {
		// reset index when reopened
		if (visible) setIndex(0);
	}, [visible]);

	function goNext() {
		setIndex((i) => Math.min(i + 1, CARDS.length - 1));
	}

	function goPrev() {
		setIndex((i) => Math.max(i - 1, 0));
	}

	function onPointerDown(e: React.PointerEvent) {
		startX.current = e.clientX;
		deltaX.current = 0;
		(e.target as Element).setPointerCapture(e.pointerId);
	}

	function onPointerMove(e: React.PointerEvent) {
		if (startX.current == null) return;
		deltaX.current = e.clientX - startX.current;
		if (cardRef.current) {
			cardRef.current.style.transform = `translateX(${deltaX.current}px)`;
		}
	}

function onPointerUp() {
		if (startX.current == null) return;
		const dx = deltaX.current;
		startX.current = null;
		deltaX.current = 0;
		if (cardRef.current) cardRef.current.style.transform = "";

		if (dx < -50) goNext();
		else if (dx > 50) goPrev();
	}

	if (!visible) return <></>;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div className="absolute inset-0 bg-black/60" onClick={() => setVisible(false)} />

			<div className="relative max-w-xl w-[90%]">
				<div
					ref={cardRef}
					onPointerDown={onPointerDown}
					onPointerMove={onPointerMove}
					onPointerUp={onPointerUp}
					className="bg-gradient-to-br from-[#0F1224] to-[#111427] border border-gray-800 rounded-2xl p-6 text-center text-white shadow-lg"
				>
					<h3 className="text-2xl font-semibold mb-2 text-[#7C3AED]">
						{CARDS[index].title}
					</h3>
					<p className="text-sm text-gray-200 mb-4">{CARDS[index].body}</p>

					<div className="flex items-center justify-between">
						<button
							onClick={goPrev}
							disabled={index === 0}
							className="px-3 py-1 rounded-md bg-gray-800/60 disabled:opacity-40"
						>
							Prev
						</button>

						<div className="flex gap-2 items-center">
							{CARDS.map((_, i) => (
								<span
									key={i}
									className={`w-2 h-2 rounded-full ${i === index ? "bg-[#7C3AED]" : "bg-gray-600"}`}
								/>
							))}
						</div>

						<div className="flex gap-2">
							{index < CARDS.length - 1 ? (
								<button onClick={goNext} className="px-3 py-1 rounded-md bg-[#7C3AED] text-black">
									Next
								</button>
							) : (
								<button onClick={() => setVisible(false)} className="px-3 py-1 rounded-md bg-[#7C3AED] text-black">
									Got it
								</button>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}