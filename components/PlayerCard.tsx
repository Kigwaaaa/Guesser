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
  action?: React.ReactNode;
};

export default function PlayerCard({
  player,
  assignment,
  isSelf = false,
  isActiveTurn = false,
  isPendingGuesser = false,
  action,
}: Props) {
  return (
    <div
      className={`relative flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border bg-gray-900 ${
        isActiveTurn ? "border-[#7C3AED] shadow-[0_0_0_1px_rgba(124,58,237,0.35)]" : "border-gray-800"
      }`}
    >
      <div className="absolute left-3 top-3 z-10 flex gap-2">
        {player.is_eliminated ? (
          <span className="rounded bg-red-700 px-2 py-1 text-xs text-white">Eliminated</span>
        ) : null}
        {!player.is_eliminated && isPendingGuesser ? (
          <span className="rounded bg-indigo-700 px-2 py-1 text-xs text-white">Guessing</span>
        ) : null}
      </div>

      <div className="relative min-h-0 flex-1 bg-gray-800">
        {isSelf ? (
          <div className="flex h-full w-full items-center justify-center">
            <svg className="h-28 w-28 sm:h-36 sm:w-36" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <rect width="24" height="24" rx="6" fill="#0F1224" />
              <path d="M12 7a3 3 0 100 6 3 3 0 000-6z" fill="#1f2937" />
              <path d="M4 19a8 8 0 0116 0v1H4v-1z" fill="#111827" />
            </svg>
          </div>
        ) : assignment && assignment.image_url ? (
          <img src={assignment.image_url} alt={assignment.name} className="h-full w-full object-cover" />
        ) : assignment ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-lg font-medium text-gray-200 sm:text-2xl">
            {assignment.name}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-sm text-gray-400">No assignment</div>
        )}
      </div>

      <div className="shrink-0 border-t border-white/5 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold sm:text-xl">{player.name}</div>
            <div className="text-xs text-gray-400 sm:text-sm">Seat #{player.turn_order_index + 1}</div>
            {!isSelf && assignment ? (
              <div className="mt-1 truncate text-sm text-violet-200 sm:text-base">{assignment.name}</div>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}