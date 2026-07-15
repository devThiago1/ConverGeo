// ============================================================================
// src/components/views/ViewEmpty.tsx
// ============================================================================
"use client";

import React from "react";
import { FlyToInterpolator } from "@deck.gl/core";
import { SearchHistoryItem } from "../../utils/constants";

interface ViewEmptyProps {
  searchHistory: SearchHistoryItem[];
  setViewState: (updater: (prev: any) => any) => void;
  setLastCoordinate: (coord: { lat: number; lng: number }) => void;
  setViewMode: (mode: "single" | "top" | "compare" | "heatmap" | null) => void;
}

export default function ViewEmpty({ searchHistory, setViewState, setLastCoordinate, setViewMode }: ViewEmptyProps) {
  return (
    <div className="p-5 mt-auto bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center text-center mt-4">
      <p className="text-sm font-semibold text-slate-600 mb-1">Pronto para a Descoberta</p>
      <p className="text-[11px] text-slate-500">Clique no mapa, pesquise um endereço, ou use as ferramentas analíticas acima.</p>
      {searchHistory.length > 0 && (
        <div className="mt-6 w-full text-left animate-fade-in">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Buscas Recentes</p>
          <div className="flex flex-col gap-2">
            {searchHistory.map((item, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setViewState((prev: any) => ({
                    ...prev,
                    longitude: item.lng,
                    latitude: item.lat,
                    zoom: 15,
                    transitionDuration: 1500,
                    transitionInterpolator: new FlyToInterpolator(),
                  }));
                  setLastCoordinate({ lat: item.lat, lng: item.lng });
                  setViewMode("single");
                }}
                className="flex justify-between items-center p-2 bg-white border border-slate-200 rounded-lg shadow-sm hover:border-blue-400 hover:bg-blue-50 transition-all text-left"
              >
                <span className="text-[11px] font-semibold text-slate-700 truncate mr-2" title={item.name}>
                  {item.name}
                </span>
                <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">{item.score.toFixed(1)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
