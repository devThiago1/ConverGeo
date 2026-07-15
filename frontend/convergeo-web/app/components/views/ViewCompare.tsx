// ============================================================================
// src/components/views/ViewCompare.tsx
// ============================================================================
"use client";

import React from "react";
import { getRadarPoint } from "../../utils/helpers";

interface ViewCompareProps {
  compareLocations: { lat: number; lng: number }[];
  hexData: any[];
  addressMap: Record<string, string>;
  getDynamicScore: (hex: any) => number;
  handlePrintPDF: () => void;
  handleCompareClick: () => void;
  handleShare: () => void;
  copied: boolean;
}

export default function ViewCompare({ compareLocations, hexData, addressMap, getDynamicScore, handlePrintPDF, handleCompareClick, handleShare, copied }: ViewCompareProps) {
  return (
    <div className="space-y-4 animate-fade-in flex-1 flex flex-col mt-4">
      <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center print:text-left print:text-base">Teste A/B</h3>
      {compareLocations.length === 0 ? (
        <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-center text-sm text-amber-700 font-medium print:hidden">
          Clique no mapa para definir o <b>Local A</b>.
        </div>
      ) : compareLocations.length === 1 && hexData.length === 1 ? (
        <div className="p-4 bg-blue-50 rounded-xl border border-blue-200 text-center text-sm text-blue-700 font-medium print:hidden">
          Local A guardado. Clique para definir o <b>Local B</b>.
        </div>
      ) : hexData.length >= 2 ? (
        <>
          <div className="bg-white border border-slate-200 rounded-xl p-2 shadow-sm relative print:border-none print:shadow-none">
            <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider mb-2">Equilíbrio de Atributos</p>
            <svg viewBox="0 0 200 180" className="w-full h-40">
              {[2, 4, 6, 8, 10].map((v) => (
                <polygon key={v} points={`${getRadarPoint(v, 0)} ${getRadarPoint(v, 120)} ${getRadarPoint(v, 240)}`} fill="none" stroke="#e2e8f0" />
              ))}
              <polygon
                points={`${getRadarPoint(hexData[0].breakdown.estrutural, 0)} ${getRadarPoint(hexData[0].breakdown.macroeconomico, 120)} ${getRadarPoint(hexData[0].breakdown.comportamental, 240)}`}
                fill="rgba(59, 130, 246, 0.4)"
                stroke="#3b82f6"
                strokeWidth="2"
              />
              <polygon
                points={`${getRadarPoint(hexData[1].breakdown.estrutural, 0)} ${getRadarPoint(hexData[1].breakdown.macroeconomico, 120)} ${getRadarPoint(hexData[1].breakdown.comportamental, 240)}`}
                fill="rgba(245, 158, 11, 0.4)"
                stroke="#f59e0b"
                strokeWidth="2"
              />
              <text x="100" y="12" fontSize="10" textAnchor="middle" fill="#64748b" fontWeight="bold">Demografia</text>
              <text x="180" y="150" fontSize="10" textAnchor="middle" fill="#64748b" fontWeight="bold">Mercado</text>
              <text x="20" y="150" fontSize="10" textAnchor="middle" fill="#64748b" fontWeight="bold">Fluxo</text>
            </svg>
          </div>
          <div className="grid grid-cols-2 gap-3 flex-1 print:gap-8">
            {hexData.slice(0, 2).map((hex: any, index: number) => {
              const dynScore = getDynamicScore(hex);
              const opponentScore = getDynamicScore(hexData[index === 0 ? 1 : 0]);
              const isWinner = dynScore > opponentScore;
              return (
                <div key={hex.h3_index} className={`flex flex-col p-3 rounded-xl border-2 transition-all print:border print:p-5 ${isWinner ? "border-green-500 bg-green-50/50 shadow-md scale-[1.02] print:scale-100 print:bg-green-50/30" : "border-slate-200 bg-white opacity-90 print:opacity-100"}`}>
                  {isWinner && (
                    <span className="text-[10px] font-black text-green-600 uppercase mb-1 text-center bg-green-100 rounded-sm py-0.5 print:text-sm print:bg-transparent print:border-b print:border-green-200 print:pb-2 print:mb-4">
                      Vencedor 🏆
                    </span>
                  )}
                  <p className="text-[11px] font-bold text-slate-700 leading-tight h-8 text-center flex items-center justify-center line-clamp-2 print:h-auto print:text-base print:mb-4">
                    {addressMap[hex.h3_index] || "A traduzir..."}
                  </p>
                  <div className="text-center my-2 border-y border-slate-100/50 py-2 print:border-none print:bg-slate-50 print:rounded-lg print:py-4">
                    <span className={`text-2xl font-black ${isWinner ? "text-green-600" : "text-slate-800"} print:text-5xl`}>{dynScore.toFixed(1)}</span>
                  </div>
                  <div className="space-y-2 mt-auto print:mt-6">
                    <p className="text-[9px] text-slate-500 flex justify-between print:text-xs">
                      <span>Demografia</span> <span className="font-bold">{hex.breakdown.estrutural.toFixed(1)}</span>
                    </p>
                    <p className="text-[9px] text-slate-500 flex justify-between print:text-xs">
                      <span>Mercado</span> <span className="font-bold">{hex.breakdown.macroeconomico.toFixed(1)}</span>
                    </p>
                    <p className="text-[9px] text-slate-500 flex justify-between print:text-xs">
                      <span>Fluxo</span> <span className="font-bold">{hex.breakdown.comportamental.toFixed(1)}</span>
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-2 space-y-2 print:hidden">
            <button onClick={handlePrintPDF} className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm">
              📄 Baixar Relatório
            </button>
            <div className="flex gap-2">
              <button onClick={handleShare} className="flex-1 text-xs font-bold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg py-2 transition-colors">
                {copied ? "✅ Copiado!" : "🔗 Partilhar"}
              </button>
              <button onClick={handleCompareClick} className="flex-1 text-xs font-bold text-slate-500 hover:text-slate-800 border border-slate-200 rounded-lg py-2 transition-colors">
                Nova Comparação
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
