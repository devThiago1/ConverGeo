// ============================================================================
// src/components/MapControls.tsx
// ============================================================================
"use client";

import React from "react";
import { MAP_STYLES } from "../utils/constants";

interface MapControlsProps {
  currentStyle: keyof typeof MAP_STYLES;
  setCurrentStyle: (style: keyof typeof MAP_STYLES) => void;
  colorMode: "total" | "ocean";
  setColorMode: (mode: "total" | "ocean") => void;
}

export default function MapControls({ currentStyle, setCurrentStyle, colorMode, setColorMode }: MapControlsProps) {
  return (
    <div className="absolute top-6 right-6 z-20 flex flex-col gap-2 items-end print:hidden">
      <div className="bg-slate-900/80 backdrop-blur-md shadow-lg rounded-xl p-1.5 border border-slate-700 flex space-x-1">
        {Object.entries(MAP_STYLES).map(([key, style]) => (
          <button
            key={key}
            onClick={() => setCurrentStyle(key as keyof typeof MAP_STYLES)}
            className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all duration-200 ${currentStyle === key ? "bg-blue-600 text-white shadow-md" : "text-slate-400 hover:bg-slate-700 hover:text-white"}`}
          >
            {style.name}
          </button>
        ))}
      </div>
      <button
        onClick={() => setColorMode(colorMode === "total" ? "ocean" : "total")}
        className={`px-3 py-2 text-[11px] font-bold rounded-xl shadow-lg border transition-all duration-300 flex items-center gap-1.5 ${colorMode === "ocean" ? "bg-sky-600 border-sky-400 text-white" : "bg-slate-900/80 border-slate-700 text-slate-400 hover:bg-slate-800"}`}
      >
        <span>🌊</span> {colorMode === "ocean" ? "Visão Oceano Azul Ativada" : "Filtrar Oceano Azul"}
      </button>
    </div>
  );
}
