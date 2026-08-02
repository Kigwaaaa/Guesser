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
          className={`card-flip w-full h-full rounded-lg shadow-2xl overflow-hidden bg-gray-900 border border-gray-800`} 
          style={{
            transformStyle: "preserve-3d",
            transition: "transform 320ms cubic-bezier(.2,.9,.2,1)",
            transform: phase === "flip" ? "rotateY(180deg)" : "rotateY(0deg)",
          }}
        >
          {/* Front face (silhouette) */}
          <div className="absolute inset-0 flex items-center justify-center backface-hidden">
            <div className="text-center text-gray-400">
              <div className="w-32 h-24 bg-[#0F1224] rounded-md flex items-center justify-center">
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="24" height="24" rx="6" fill="#0F1224" />
                  <path d="M12 7a3 3 0 100 6 3 3 0 000-6z" fill="#1f2937" />
                </svg>
              </div>
              <div className="mt-3 text-sm text-gray-400">Revealing...</div>
            </div>
          </div>

          {/* Back face (identity) */}
          <div
            className="absolute inset-0 flex items-center justify-center backface-hidden"
            style={{ transform: "rotateY(180deg)", backfaceVisibility: "hidden" }}
          >
            <div className="w-full h-full p-4 flex flex-col items-center justify-center bg-gradient-to-br from-[#0F1224] to-[#111827]">
              <div className="w-32 h-24 rounded-md overflow-hidden shadow-inner bg-black">
                {imageUrl ? <img src={imageUrl} alt={playerName} className="w-full h-full object-cover" /> : <div className="w-full h-full bg-gray-800" />}
              </div>
              <div className="mt-3 text-white font-semibold text-lg">{playerName}</div>
              {phase === "reveal" || phase === "done" ? (
                <div className="mt-4">
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
        .backface-hidden { backface-visibility: hidden; -webkit-backface-visibility: hidden; }
        .unmask-root { background: rgba(2,6,23,0.6); }
        .card-flip { perspective: 1000px; }
      `}</style>
    </div>
  );
}
// Identity unmask animation placeholder.