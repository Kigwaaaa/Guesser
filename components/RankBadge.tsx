"use client";

import React from "react";

type Props = { rank: number };

export default function RankBadge({ rank }: Props) {
  return (
    <div className="rank-badge-wrapper" style={{ display: "inline-block" }}>
      <div
        className="rank-badge"
        style={{
          background: "linear-gradient(90deg,#7C3AED,#5B21B6)",
          color: "white",
          padding: "6px 10px",
          borderRadius: 9999,
          fontWeight: 700,
          transform: "translateY(-10px)",
          opacity: 0,
          transition: "transform 420ms cubic-bezier(.2,.9,.2,1), opacity 420ms ease-in",
        }}
      >
        #{rank}
      </div>
      <style>{`
        .rank-badge-wrapper.play .rank-badge { transform: translateY(0); opacity: 1; }
      `}</style>
    </div>
  );
}
// First-through-fourth place rank badge placeholder.