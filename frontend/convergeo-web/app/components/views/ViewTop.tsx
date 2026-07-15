// ============================================================================
// src/components/views/ViewTop.tsx
// ============================================================================
"use client";

import React from "react";
import { getSegmentName } from "../../utils/helpers";

interface ViewTopProps {
  hexData: any[];
  addressMap: Record<string, string>;
  getDynamicScore: (hex: any) => number;
  handleExportCSV: () => void;
  activeSegment: string;
}

export default function ViewTop({ hexData, addressMap, getDynamicScore, handleExportCSV, activeSegment }: ViewTopProps) {
  return (
    <div className="space-y-3 animate-fade-in flex-1 mt-4">
      <div className="hidden print:block bg-slate-50 border border-slate-200 p-4 rounded-lg mb-6">
        <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Segmento Analisado</p>
        <p className="text-lg font-black text-slate-800">{getSegmentName(activeSegment)}</p>
      </div>
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 print:text-base print:mb-6">Ranking de Oportunidades</h3>
      {hexData.map((hex: any, index: number) => (
        <div key={hex.h3_index} className="flex items-center p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-blue-300 transition-all cursor-default print:border-slate-300 print:mb-4">
          <div className={`min-w-8 h-8 rounded-full flex items-center justify-center text-white font-bold mr-3 print:w-10 print:h-10 print:text-lg ${index === 0 ? "bg-blue-600" : "bg-slate-300 print:bg-slate-400"}`}>
            {index + 1}
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold text-slate-700 leading-tight mb-1 print:text-base">{addressMap[hex.h3_index] || "A procurar zona..."}</p>
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-slate-400 font-mono print:text-xs">H3: {hex.h3_index.substring(0, 6)}...</p>
              <p className="text-xs font-bold text-slate-600 print:text-sm">
                Nota: <span className="text-green-600 text-sm font-black print:text-base">{getDynamicScore(hex).toFixed(2)}</span>
              </p>
            </div>
          </div>
        </div>
      ))}
      <div className="pt-2 flex flex-col gap-2 print:hidden">
        <button onClick={handleExportCSV} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm shadow-sm">
          📊 Exportar Top 5 (CSV)
        </button>
      </div>
    </div>
  );
}
