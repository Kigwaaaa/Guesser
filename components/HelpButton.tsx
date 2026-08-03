"use client";

import React from "react";

export default function HelpButton(): JSX.Element {
  function openExplainer() {
    window.dispatchEvent(new Event("openExplainer"));
  }

  return (
    <button
      aria-label="Open help"
      onClick={openExplainer}
      className="fixed right-6 bottom-6 w-12 h-12 rounded-full bg-[#7C3AED] text-black flex items-center justify-center shadow-lg"
    >
      ?
    </button>
  );
}
