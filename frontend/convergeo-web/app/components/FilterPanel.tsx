// ============================================================================
// src/components/FilterPanel.tsx
// ============================================================================
"use client";

import React from "react";

interface FilterPanelProps {
  searchQuery: string;
  setSearchQuery: (v: string) => void;
  handleAddressSearch: (e: React.FormEvent) => void;
  isSearching: boolean;
  searchError: string;
  activeSegment: string;
  setActiveSegment: (v: string) => void;
  showSliders: boolean;
  setShowSliders: (v: boolean) => void;
  weightDemografia: number;
  setWeightDemografia: (v: number) => void;
  weightMercado: number;
  setWeightMercado: (v: number) => void;
  weightFluxo: number;
  setWeightFluxo: (v: number) => void;
  viewMode: "single" | "top" | "compare" | "heatmap" | null;
  handleTop5Click: () => void;
  handleHeatmapClick: () => void;
  handleCompareClick: () => void;
}

export default function FilterPanel(props: FilterPanelProps) {
  return (
    <div className="flex flex-col space-y-3 print:hidden">
      <form onSubmit={props.handleAddressSearch} className="relative">
        <input
          type="text"
          placeholder="Pesquisar rua ou bairro..."
          value={props.searchQuery}
          onChange={(e) => props.setSearchQuery(e.target.value)}
          className="w-full bg-slate-100 border border-slate-200 text-slate-800 text-xs rounded-lg pl-3 pr-10 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
        />
        <button type="submit" disabled={props.isSearching} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600">
          {props.isSearching ? <span className="animate-spin block">⏳</span> : "🔍"}
        </button>
      </form>
      {props.searchError && <p className="text-[10px] font-bold text-red-500 animate-fade-in">{props.searchError}</p>}

      <div className="flex flex-col space-y-2 pt-2">
        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Qual negócio deseja abrir?</label>
        <select
          value={props.activeSegment}
          onChange={(e) => props.setActiveSegment(e.target.value)}
          className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full p-2 outline-none font-semibold shadow-sm"
        >
          <option value="food_service">🍔 Restauração (Food Service)</option>
          <option value="farmacia">💊 Farmácia e Drogaria</option>
          <option value="vestuario">👕 Vestuário e Moda</option>
          <option value="clinica">🩺 Clínica Médica</option>
        </select>
      </div>

      <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden mt-1">
        <button onClick={() => props.setShowSliders(!props.showSliders)} className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-700 flex justify-between items-center hover:bg-slate-100">
          <span>⚙️ Personalizar Motor IA</span>
          <span>{props.showSliders ? "▲" : "▼"}</span>
        </button>
        {props.showSliders && (
          <div className="p-3 space-y-3 border-t border-slate-200 bg-white">
            <div>
              <label className="text-[10px] font-bold text-slate-500 flex justify-between">
                <span>Demografia (Censo)</span> <span>{props.weightDemografia}%</span>
              </label>
              <input type="range" min="0" max="100" value={props.weightDemografia} onChange={(e) => props.setWeightDemografia(Number(e.target.value))} className="w-full h-1 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 flex justify-between">
                <span>Mercado (Concorrência)</span> <span>{props.weightMercado}%</span>
              </label>
              <input type="range" min="0" max="100" value={props.weightMercado} onChange={(e) => props.setWeightMercado(Number(e.target.value))} className="w-full h-1 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-500" />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 flex justify-between">
                <span>Fluxo (Mobilidade)</span> <span>{props.weightFluxo}%</span>
              </label>
              <input type="range" min="0" max="100" value={props.weightFluxo} onChange={(e) => props.setWeightFluxo(Number(e.target.value))} className="w-full h-1 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600" />
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 w-full mt-2">
        <button onClick={props.handleTop5Click} className={`font-bold py-2 px-1 text-[10px] rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1 ${props.viewMode === "top" ? "bg-blue-600 text-white" : "bg-slate-900 text-white hover:bg-slate-800"}`}>
          <span>🌟 Top 5</span>
        </button>
        <button onClick={props.handleHeatmapClick} className={`font-bold py-2 px-1 text-[10px] rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1 ${props.viewMode === "heatmap" ? "bg-purple-600 text-white" : "bg-slate-200 text-slate-800 hover:bg-slate-300"}`}>
          <span>🗺️ Raio-X Cidade</span>
        </button>
        <button onClick={props.handleCompareClick} className={`col-span-2 font-bold py-2 px-1 text-[10px] rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1 ${props.viewMode === "compare" ? "bg-amber-500 text-white" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"}`}>
          <span>⚖️ Iniciar Teste A/B</span>
        </button>
      </div>
    </div>
  );
}
