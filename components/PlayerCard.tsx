"use client";

import React from "react";

type Props = {
  player: {
    id: string;
    name: string;
    turn_order_index: number;
    is_eliminated?: boolean;
  };
  assignment?: { name: string; image_url?: string | null } | null;
  isSelf?: boolean;
  isActiveTurn?: boolean;
  isPendingGuesser?: boolean;
};

export default function PlayerCard({ player, assignment, isSelf = false, isActiveTurn = false, isPendingGuesser = false }: Props) {
  return (
    <div
      className={`relative p-3 rounded-lg border ${isActiveTurn ? "border-[#7C3AED] shadow-lg" : "border-gray-800"} bg-gray-900`}
    >
      {/* status badges */}
      <div className="absolute -mt-3 ml-3 flex gap-2">
        {player.is_eliminated ? (
          <span className="text-xs bg-red-700 text-white px-2 py-1 rounded">Eliminated</span>
        ) : null}
        {!player.is_eliminated && isPendingGuesser ? (
          <span className="text-xs bg-indigo-700 text-white px-2 py-1 rounded">Guessing</span>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <div className="w-20 h-20 rounded-md flex items-center justify-center bg-gray-800 overflow-hidden">
          {isSelf ? (
            // silhouette / face-down
            <svg width="56" height="56" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect width="24" height="24" rx="6" fill="#0F1224" />
              <path d="M12 7a3 3 0 100 6 3 3 0 000-6z" fill="#1f2937" />
              <path d="M4 19a8 8 0 0116 0v1H4v-1z" fill="#111827" />
            </svg>
          ) : assignment && assignment.image_url ? (
            <img src={assignment.image_url} alt={assignment.name} className="w-full h-full object-cover" />
          ) : assignment ? (
            <div className="text-xs text-gray-300 px-2 text-center leading-tight">{assignment.name}</div>
          ) : (
            <div className="text-xs text-gray-400 px-2">No assignment</div>
          )}
        </div>

        <div className="flex-1">
          <div className="font-medium">{player.name}</div>
          <div className="text-xs text-gray-400">Seat #{player.turn_order_index + 1}</div>
          {!isSelf && assignment && (
            <div className="mt-2 text-sm text-gray-200">{assignment.name}</div>
          )}
        </div>
      </div>
    </div>
  );
}
// Player identity or silhouette card placeholder.