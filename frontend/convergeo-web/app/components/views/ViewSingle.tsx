// ============================================================================
// src/components/views/ViewSingle.tsx
// ============================================================================
"use client";

import React from "react";
import { getBusinessMetrics } from "../../utils/helpers";
import ScoreProgressBar from "../ScoreProgressBar";

interface ViewSingleProps {
  hexData: any[];
  addressMap: Record<string, string>;
  getDynamicScore: (hex: any) => number;
  activeSegment: string;
  competitorPins: { lat: number; lng: number }[];
  handlePrintPDF: () => void;
  handleShare: () => void;
  handleExportCSV: () => void;
  copied: boolean;
}

export default function ViewSingle({ hexData, addressMap, getDynamicScore, activeSegment, competitorPins, handlePrintPDF, handleShare, handleExportCSV, copied }: ViewSingleProps) {
  const hex = hexData[0];
  const dynScore = getDynamicScore(hex);
  const metrics = getBusinessMetrics(activeSegment, dynScore);

  return (
    <div className="space-y-4 animate-fade-in print:space-y-8 mt-4">
      <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-start gap-3 print:bg-transparent print:border-b print:border-slate-200 print:rounded-none print:pb-4">
        <span className="text-xl print:text-2xl">📍</span>
        <div>
          <p className="text-xs font-bold text-blue-600 uppercase print:text-sm">Localização Analisada</p>
          <p className="text-sm font-bold text-slate-800 leading-tight print:text-xl">{addressMap[hex.h3_index] || "A pesquisar endereço..."}</p>
        </div>
      </div>
      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex justify-between items-center print:p-8">
        <div>
          <p className="text-xs font-bold text-slate-500 uppercase mb-1 print:text-sm">Score ConverGeo</p>
          <div className="flex items-end gap-1">
            <span className="text-4xl font-black text-slate-800 print:text-6xl">{dynScore.toFixed(2)}</span>
            <span className="text-sm text-slate-400 mb-1 print:text-lg">/10</span>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 print:text-sm">Risco Geocomercial</p>
          <span className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wide print:text-lg ${metrics.riskColor}`}>{metrics.risk}</span>
        </div>
      </div>
      {competitorPins.length > 0 && (
        <div className="bg-red-50 border border-red-100 p-2 rounded-lg flex items-center justify-between animate-fade-in print:hidden">
          <span className="text-[10px] font-bold text-red-600 uppercase flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span> Raio-X Concorrência
          </span>
          <span className="text-[10px] text-red-500 font-medium">{competitorPins.length} Concorrentes no mapa</span>
        </div>
      )}
      <div className="space-y-3 print:mt-10">
        <h3 className="text-[10px] font-bold text-slate-400 uppercase print:text-base">Projeção Financeira</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white border border-slate-100 p-2 rounded text-center print:border-slate-300 print:p-4">
            <p className="text-[9px] text-slate-400 print:text-sm">Investimento Estimado</p>
            <p className="text-xs font-bold print:text-lg">{metrics.investment}</p>
          </div>
          <div className="bg-white border border-slate-100 p-2 rounded text-center print:border-slate-300 print:p-4">
            <p className="text-[9px] text-slate-400 print:text-sm">Ponto de Equilíbrio (ROI)</p>
            <p className="text-xs font-bold text-green-500 print:text-lg">{metrics.roi}</p>
          </div>
        </div>
      </div>
      <div className="space-y-3 print:mt-10">
        <ScoreProgressBar label="Demografia (Censo)" value={hex.breakdown.estrutural} colorClass="bg-blue-500" />
        <ScoreProgressBar label="Saturação de Mercado" value={hex.breakdown.macroeconomico} colorClass="bg-amber-500" />
        <ScoreProgressBar label="Infraestrutura e Fluxo" value={hex.breakdown.comportamental} colorClass="bg-purple-500" />
      </div>
      <div className="pt-2 flex flex-col gap-2 print:hidden">
        <button onClick={handlePrintPDF} className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-lg shadow-sm">
          📄 Gerar PDF Executivo
        </button>
        <div className="flex gap-2">
          <button onClick={handleShare} className="flex-1 border border-slate-200 bg-white text-slate-700 font-bold py-2 rounded-lg text-[10px] hover:bg-slate-50">
            {copied ? "✅ Copiado!" : "🔗 Partilhar Dossiê"}
          </button>
          <button onClick={handleExportCSV} className="flex-1 border border-slate-200 bg-white text-slate-700 font-bold py-2 rounded-lg text-[10px] hover:bg-slate-50">
            📊 Exportar CSV
          </button>
        </div>
      </div>
    </div>
  );
}
