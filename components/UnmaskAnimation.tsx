"use client";

import React, { useEffect, useState } from "react";
import RankBadge from "./RankBadge";

type Props = {
  playerName: string;
  imageUrl?: string | null;
  rank?: number | null;
  onFinished?: () => void;
  playKey?: string | number;
};

export default function UnmaskAnimation({ playerName, imageUrl, rank, onFinished, playKey }: Props) {
  const [phase, setPhase] = useState<"idle" | "flip" | "reveal" | "done">("idle");

  useEffect(() => {
    if (typeof playKey === "undefined") return;
    // start animation sequence
    setPhase("flip");
    const t1 = setTimeout(() => setPhase("reveal"), 320); // flip duration ~320ms
    const t2 = setTimeout(() => setPhase("done"), 900); // total <1s
    const t3 = setTimeout(() => onFinished && onFinished(), 1100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [playKey]);

  return (
    <div className="unmask-root fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
      <div className="relative w-72 h-44">
        <div
          className={`mask-lift w-full h-full overflow-hidden ${phase === "reveal" || phase === "done" ? "is-revealed" : ""}`}
          style={{
            transition: "transform 420ms cubic-bezier(.2,.9,.2,1), opacity 420ms ease",
            transform: phase === "reveal" || phase === "done" ? "scale(1.02)" : "scale(1)",
          }}
        >
          <div className="mask-panel" />

          <div className="absolute inset-0 flex items-center justify-center bg-[#0B2A22]/90 p-4">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="w-32 h-24 overflow-hidden border border-[rgba(201,162,39,0.5)] bg-[#1B3A2E]">
                {imageUrl ? <img src={imageUrl} alt={playerName} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-[#304c41]" />}
              </div>
              <div className="reveal-name mt-3">{playerName}</div>
              {phase === "reveal" || phase === "done" ? (
                <div className="mt-3">
                  <div className={`rank-badge-container ${phase === "reveal" ? "play" : ""}`}>
                    {typeof rank === "number" ? <RankBadge rank={rank} /> : null}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .unmask-root { background: rgba(11,42,34,0.68); }
      `}</style>
    </div>
  );
}
// Identity unmask animation placeholder.