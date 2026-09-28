"use client";

import React, { useEffect, useRef, useState } from "react";

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
  const [visible, setVisible] = useState(true);
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
          className="masquerade-panel rounded-[1.6rem] p-6 text-center text-[#F5EFE3]"
        >
          <h3 className="text-3xl mb-2" style={{ fontFamily: "var(--font-display)", color: "var(--color-accent)" }}>
            {CARDS[index].title}
          </h3>
          <p className="text-sm muted-copy mb-4">{CARDS[index].body}</p>

          <div className="flex items-center justify-between">
            <button
              onClick={goPrev}
              disabled={index === 0}
              className="ivory-button px-3 py-1 text-sm disabled:opacity-40"
            >
              Prev
            </button>

            <div className="flex gap-2 items-center">
              {CARDS.map((_, i) => (
                <span
                  key={i}
                  className={`w-2 h-2 rounded-full ${i === index ? "bg-[var(--color-accent)]" : "bg-[rgba(245,239,227,0.35)]"}`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              {index < CARDS.length - 1 ? (
                <button onClick={goNext} className="gold-button px-3 py-1 text-sm">
                  Next
                </button>
              ) : (
                <button onClick={() => setVisible(false)} className="gold-button px-3 py-1 text-sm">
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
