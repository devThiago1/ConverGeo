// ============================================================================
// src/components/views/ViewHeatmap.tsx
// ============================================================================
"use client";

import React from "react";

interface ViewHeatmapProps {
  minHeatmapScore: number;
  setMinHeatmapScore: (v: number) => void;
  handleExportCSV: () => void;
}

export default function ViewHeatmap({ minHeatmapScore, setMinHeatmapScore, handleExportCSV }: ViewHeatmapProps) {
  return (
    <div className="space-y-4 animate-fade-in flex-1 flex flex-col text-center mt-4">
      <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl">
        <span className="text-3xl mb-2 block">🔥</span>
        <h3 className="text-sm font-black text-purple-800 uppercase">Raio-X Ativado</h3>
        <p className="text-[11px] text-purple-600 mt-2 font-medium">Renderizando os 300 melhores pontos para o seu negócio em 3D.</p>
        <div className="mt-4 pt-3 border-t border-purple-200/50">
          <label className="text-[10px] font-bold text-purple-700 flex justify-between mb-1">
            <span>Filtro de Nota Mínima:</span>
            <span>{minHeatmapScore.toFixed(1)} / 10</span>
          </label>
          <input type="range" min="0" max="9.5" step="0.5" value={minHeatmapScore} onChange={(e) => setMinHeatmapScore(Number(e.target.value))} className="w-full h-1 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
        </div>
      </div>
      <div className="mt-auto pt-4 print:hidden">
        <button onClick={handleExportCSV} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-sm shadow-sm transition-all">
          📊 Exportar Matriz (CSV)
        </button>
      </div>
    </div>
  );
}
