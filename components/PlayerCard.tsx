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
    <div className={`masque-card ${isActiveTurn ? "is-active" : ""}`}>
      <div className="absolute left-3 top-3 z-10 flex gap-2">
        {player.is_eliminated ? (
          <span className="eliminated-pill">Eliminated</span>
        ) : null}
        {!player.is_eliminated && isPendingGuesser ? (
          <span className="guest-tag">Guessing</span>
        ) : null}
      </div>

      <div className="masque-card__body">
        {isSelf ? (
          <div className="flex h-full w-full items-center justify-center">
            <svg className="h-28 w-28 sm:h-36 sm:w-36 opacity-80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
              <rect width="24" height="24" rx="6" fill="#0B2A22" />
              <path d="M12 7a3 3 0 100 6 3 3 0 000-6z" fill="#4C6B5B" />
              <path d="M4 19a8 8 0 0116 0v1H4v-1z" fill="#304c41" />
            </svg>
          </div>
        ) : assignment && assignment.image_url ? (
          <img src={assignment.image_url} alt={assignment.name} className="h-full w-full object-cover" />
        ) : assignment ? (
          <div className="flex h-full items-center justify-center px-4 text-center text-lg font-medium text-[#F5EFE3] sm:text-2xl" style={{ fontFamily: "var(--font-display)" }}>
            {assignment.name}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center px-4 text-sm muted-copy">No assignment</div>
        )}
      </div>

      <div className="masque-card__meta shrink-0 px-4 py-3 sm:px-5 sm:py-4">
        <div className="flex items-end justify-between gap-3">
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold sm:text-xl" style={{ fontFamily: "var(--font-display)" }}>{player.name}</div>
            <div className="text-xs muted-copy sm:text-sm">Seat #{player.turn_order_index + 1}</div>
            {!isSelf && assignment ? (
              <div className="mt-1 truncate text-sm muted-copy sm:text-base">{assignment.name}</div>
            ) : null}
          </div>
          {action ? <div className="shrink-0">{action}</div> : null}
        </div>
      </div>
    </div>
  );
}