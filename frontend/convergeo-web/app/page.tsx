"use client";

import React, { useState, useEffect } from "react";

// ============================================================================
// ATENÇÃO: PARA COPIAR PARA O SEU VS CODE LOCAL (NEXT.JS)
// APAGUE ESTES IMPORTS DO ESM.SH E DESCOMENTE OS IMPORTS LOCAIS ABAIXO
// ============================================================================
import DeckGL from "@deck.gl/react";
// // @ts-ignore
import { H3HexagonLayer } from "@deck.gl/geo-layers";
import { ScatterplotLayer } from "@deck.gl/layers";
import { FlyToInterpolator } from "@deck.gl/core";
import { Map } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
// ============================================================================

// import DeckGL from "https://esm.sh/@deck.gl/react@8.9.3?deps=react@18.2.0";
// import { H3HexagonLayer } from "https://esm.sh/@deck.gl/geo-layers@8.9.3?deps=react@18.2.0";
// import { ScatterplotLayer } from "https://esm.sh/@deck.gl/layers@8.9.3?deps=react@18.2.0";
// import { FlyToInterpolator } from "https://esm.sh/@deck.gl/core@8.9.3?deps=react@18.2.0";
// import { Map } from "https://esm.sh/react-map-gl@7.1.7/maplibre?deps=react@18.2.0,maplibre-gl@3.6.2";

const MAP_STYLES = {
  dark: {
    name: "Escuro (Recomendado)",
    url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  },
  positron: {
    name: "Claro",
    url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  },
  voyager: {
    name: "Ruas",
    url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
  },
};

interface SearchHistoryItem {
  h3_index: string;
  name: string;
  score: number;
  lat: number;
  lng: number;
}

export default function App() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [hexData, setHexData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentStyle, setCurrentStyle] =
    useState<keyof typeof MAP_STYLES>("dark");
  const [activeSegment, setActiveSegment] = useState("food_service");

  // Controle da Câmera Livre e Voo Animado (FlyTo)
  const [viewState, setViewState] = useState({
    longitude: -38.4813,
    latitude: -12.9515,
    zoom: 12.5,
    pitch: 0, // Começa em 2D, mas o usuário pode mexer
    bearing: 0,
  });

  // Modos de Visualização & Pesquisa
  const [viewMode, setViewMode] = useState<
    "single" | "top" | "compare" | "heatmap" | null
  >(null);
  const [lastCoordinate, setLastCoordinate] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [compareLocations, setCompareLocations] = useState<
    { lat: number; lng: number }[]
  >([]);

  // Novas Funcionalidades Premium
  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [colorMode, setColorMode] = useState<"total" | "ocean">("total"); // Normal vs Oceano Azul
  const [minHeatmapScore, setMinHeatmapScore] = useState(0); // Filtro do Heatmap
  const [competitorPins, setCompetitorPins] = useState<
    { lat: number; lng: number }[]
  >([]); // Raio-X Concorrência

  const [addressMap, setAddressMap] = useState<Record<string, string>>({});
  const [searchHistory, setSearchHistory] = useState<SearchHistoryItem[]>([]);
  const [reportMeta, setReportMeta] = useState({ id: "", date: "" });
  const [copied, setCopied] = useState(false);

  const [weightDemografia, setWeightDemografia] = useState(35);
  const [weightMercado, setWeightMercado] = useState(40);
  const [weightFluxo, setWeightFluxo] = useState(25);
  const [showSliders, setShowSliders] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setReportMeta({
        id: Date.now().toString().slice(-6),
        date: new Date().toLocaleDateString("pt-BR"),
      });
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getDynamicScore = (hex: any) => {
    const totalWeight = weightDemografia + weightMercado + weightFluxo;
    if (totalWeight === 0) return 0;
    const bd = hex.breakdown || {};
    return (
      ((bd.estrutural || 0) * weightDemografia +
        (bd.macroeconomico || 0) * weightMercado +
        (bd.comportamental || 0) * weightFluxo) /
      totalWeight
    );
  };

  const handleAddressSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setSearchError("");
    try {
      // Usamos o Nominatim para procurar a rua. O "Salvador, Bahia" força a cidade.
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ", Salvador, Bahia")}&limit=1`,
      );
      const data = await res.json();

      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);

        // Magia: Faz a câmara "voar" em 3D para o local pesquisado
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setViewState((prev: any) => ({
          ...prev,
          longitude: lng,
          latitude: lat,
          zoom: 15, // Aproxima
          pitch: 45, // Inclina para mostrar o 3D
          transitionDuration: 2500,
          transitionInterpolator: new FlyToInterpolator(),
        }));

        setLastCoordinate({ lat, lng });
        setViewMode("single");
        setSearchQuery("");
      } else {
        setSearchError("Endereço não encontrado. Tente ser mais específico.");
        setTimeout(() => setSearchError(""), 4000);
      }
    } catch (err) {
      console.error(err);
      setSearchError("Erro na geolocalização.");
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    const fetchDadosDaAPI = async () => {
      setLoading(true);
      try {
        const rawUrl =
          process.env.NEXT_PUBLIC_API_URL || "https://convergeo.onrender.com";
        const baseUrl = rawUrl.replace(/\/$/, "");

        if (viewMode === "heatmap") {
          const res = await fetch(
            `${baseUrl}/top?segmento=${activeSegment}&limit=300`,
          );
          if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
          const data = await res.json();
          setHexData(data.status === "sucesso" ? data.recomendacoes : []);
        } else if (viewMode === "top") {
          const res = await fetch(
            `${baseUrl}/top?segmento=${activeSegment}&limit=5`,
          );
          if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
          const data = await res.json();
          setHexData(data.status === "sucesso" ? data.recomendacoes : []);
        } else if (viewMode === "single" && lastCoordinate) {
          const res = await fetch(
            `${baseUrl}/score?lat=${lastCoordinate.lat}&lng=${lastCoordinate.lng}&segmento=${activeSegment}`,
          );
          if (!res.ok) throw new Error(`Erro HTTP: ${res.status}`);
          const data = await res.json();
          const singleHex = data.status === "sucesso" ? [data] : [];
          setHexData(singleHex);

          // Geração do Raio-X de Concorrentes (Pins Visuais baseados na nota Macro)
          if (singleHex.length > 0) {
            const macroScore = singleHex[0].breakdown?.macroeconomico || 0;
            // Se a nota é 0, gera 25 concorrentes. Se é 10, gera 0.
            const numPins = Math.max(0, Math.floor((10 - macroScore) * 2.5));
            const pins = [];
            for (let i = 0; i < numPins; i++) {
              const radius = 0.005 * Math.sqrt(Math.random()); // Dispersão aleatória
              const theta = Math.random() * 2 * Math.PI;
              pins.push({
                lat: singleHex[0].lat + radius * Math.cos(theta),
                lng: singleHex[0].lng + radius * Math.sin(theta),
              });
            }
            setCompetitorPins(pins);
          } else {
            setCompetitorPins([]);
          }
        } else if (viewMode === "compare" && compareLocations.length > 0) {
          setCompetitorPins([]);
          const promises = compareLocations.map((loc) =>
            fetch(
              `${baseUrl}/score?lat=${loc.lat}&lng=${loc.lng}&segmento=${activeSegment}`,
            ).then((r) => r.json()),
          );
          const results = await Promise.all(promises);
          setHexData(results.filter((d) => d.status === "sucesso"));
        }
      } catch (error) {
        console.error("Erro API:", error);
        setHexData([]);
      } finally {
        setLoading(false);
      }
    };

    if (viewMode !== null) fetchDadosDaAPI();
  }, [viewMode, activeSegment, lastCoordinate, compareLocations]);

  useEffect(() => {
    const fetchAddresses = async () => {
      if (viewMode === "heatmap") return;
      const newAddresses = { ...addressMap };
      let updated = false;

      for (const hex of hexData) {
        if (hex.lat && hex.lng && !newAddresses[hex.h3_index]) {
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${hex.lat}&lon=${hex.lng}&zoom=14`,
            );
            const data = await res.json();
            const addr = data.address || {};
            const localName =
              addr.suburb ||
              addr.neighbourhood ||
              addr.road ||
              addr.city_district ||
              "Salvador";
            newAddresses[hex.h3_index] = localName;
            updated = true;

            if (hexData.length === 1 && viewMode === "single") {
              const dynScore = getDynamicScore(hex);
              setSearchHistory((prev) => {
                if (prev.some((item) => item.h3_index === hex.h3_index))
                  return prev;
                return [
                  {
                    h3_index: hex.h3_index,
                    name: localName,
                    score: dynScore,
                    lat: hex.lat,
                    lng: hex.lng,
                  },
                  ...prev,
                ].slice(0, 5);
              });
            }
          } catch {
            newAddresses[hex.h3_index] = "Área Analisada";
            updated = true;
          }
          await new Promise((r) => setTimeout(r, 1000));
        }
      }
      if (updated) setAddressMap(newAddresses);
    };

    if (hexData.length > 0) fetchAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hexData, viewMode]);

  const handleTop5Click = () => {
    setViewMode("top");
    setCompetitorPins([]);
  };
  const handleHeatmapClick = () => {
    setViewMode("heatmap");
    setCompetitorPins([]);
  };
  const handleCompareClick = () => {
    setViewMode("compare");
    setCompareLocations([]);
    setHexData([]);
    setCompetitorPins([]);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMapClick = (info: any) => {
    if (!info.coordinate) return;
    const [lng, lat] = info.coordinate;
    if (viewMode === "compare") {
      setCompareLocations((prev) =>
        prev.length >= 2 ? [{ lat, lng }] : [...prev, { lat, lng }],
      );
    } else {
      setLastCoordinate({ lat, lng });
      setViewMode("single");
    }
  };

  const handlePrintPDF = () => window.print();

  const handleExportCSV = () => {
    const headers = [
      "ID_H3",
      "Localizacao",
      "Nota_Personalizada",
      "Demografia",
      "Saturacao_Mercado",
      "Fluxo",
    ];
    // Filtra os dados no CSV se o heatmap tiver o slider ativado
    const dataToExport =
      viewMode === "heatmap"
        ? hexData.filter((h) => getDynamicScore(h) >= minHeatmapScore)
        : hexData;

    const rows = dataToExport.map((hex) => [
      hex.h3_index,
      `"${addressMap[hex.h3_index] || "Salvador"}"`,
      getDynamicScore(hex).toFixed(2),
      hex.breakdown?.estrutural?.toFixed(2) || 0,
      hex.breakdown?.macroeconomico?.toFixed(2) || 0,
      hex.breakdown?.comportamental?.toFixed(2) || 0,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `ConverGeo_Analise_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShare = () => {
    try {
      const url = typeof window !== "undefined" ? window.location.href : "";
      if (navigator.clipboard) navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error(err);
    }
  };

  const getRadarPoint = (
    val: number,
    angle: number,
    cx = 100,
    cy = 90,
    rMax = 70,
  ) => {
    const rad = (angle - 90) * (Math.PI / 180);
    const r = (val / 10) * rMax;
    return `${cx + r * Math.cos(rad)},${cy + r * Math.sin(rad)}`;
  };

  const getBusinessMetrics = (segment: string, score: number) => {
    let baseInv = 100000;
    if (segment === "food_service") baseInv = 150000;
    if (segment === "farmacia") baseInv = 300000;
    if (segment === "vestuario") baseInv = 80000;
    if (segment === "clinica") baseInv = 250000;
    const adjustedInv = baseInv * (1 + (score / 10) * 0.25);
    const formattedInv = new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      maximumFractionDigits: 0,
    }).format(adjustedInv);
    const roiMonths =
      score >= 8
        ? 12 + Math.floor((10 - score) * 1.5)
        : score >= 5
          ? 18 + Math.floor((8 - score) * 3)
          : 36 + Math.floor((5 - score) * 4);
    const riskLevel = score >= 7.5 ? "Baixo" : score >= 5 ? "Moderado" : "Alto";
    const riskColor =
      score >= 7.5
        ? "text-green-600 bg-green-50"
        : score >= 5
          ? "text-amber-500 bg-amber-50"
          : "text-red-500 bg-red-50";
    return {
      investment: formattedInv,
      roi: `${roiMonths} meses`,
      risk: riskLevel,
      riskColor,
    };
  };

  // Aplica o filtro de Heatmap no mapa
  const visibleHexData =
    viewMode === "heatmap"
      ? hexData.filter((d) => getDynamicScore(d) >= minHeatmapScore)
      : hexData;

  const layers = [
    new H3HexagonLayer({
      id: "h3-hexagon-layer",
      data: visibleHexData,
      pickable: true,
      extruded: true, // 3D Ativo
      elevationScale: 50,
      stroked: true,
      filled: true,
      lineWidthMinPixels: 1,
      coverage: 0.95,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getHexagon: (d: any) => d.h3_index,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getElevation: (d: any) => getDynamicScore(d) * 10,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getFillColor: (d: any) => {
        // Lógica de Cor "Oceano Azul / Vermelho"
        if (colorMode === "ocean") {
          const s = d.breakdown?.macroeconomico || 0;
          if (s >= 7) return [14, 165, 233, 200]; // Azul Claro (Oceano Azul)
          if (s >= 4) return [168, 85, 247, 200]; // Roxo (Transição)
          return [239, 68, 68, 200]; // Vermelho (Oceano Vermelho)
        }
        // Lógica Normal (Score Total)
        const s = getDynamicScore(d);
        if (s >= 7) return [16, 185, 129, 200];
        if (s >= 4) return [245, 158, 11, 200];
        return [239, 68, 68, 200];
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getLineColor: () => [255, 255, 255, 50],
      updateTriggers: {
        getElevation: [weightDemografia, weightMercado, weightFluxo],
        getFillColor: [weightDemografia, weightMercado, weightFluxo, colorMode],
      },
    }),

    // Camada de Pins (Pontos de Concorrentes)
    new ScatterplotLayer({
      id: "competitor-pins-layer",
      data: competitorPins,
      pickable: false,
      opacity: 0.8,
      stroked: true,
      filled: true,
      radiusScale: 10,
      radiusMinPixels: 3,
      radiusMaxPixels: 10,
      lineWidthMinPixels: 1,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getPosition: (d: any) => [d.lng, d.lat],
      getFillColor: [239, 68, 68], // Vermelho
      getLineColor: [255, 255, 255],
    }),
  ];

  return (
    <main className="w-full h-screen relative overflow-hidden bg-slate-900 print:bg-white print:h-auto print:overflow-visible">
      <link
        href="https://unpkg.com/maplibre-gl@3.x/dist/maplibre-gl.css"
        rel="stylesheet"
      />

      {/* SELETORES DO MAPA (Canto Superior Direito) */}
      <div className="absolute top-6 right-6 z-20 flex flex-col gap-2 items-end print:hidden">
        <div className="bg-slate-900/80 backdrop-blur-md shadow-lg rounded-xl p-1.5 border border-slate-700 flex space-x-1">
          {Object.entries(MAP_STYLES).map(([key, style]) => (
            <button
              key={key}
              onClick={() => setCurrentStyle(key as keyof typeof MAP_STYLES)}
              className={`px-3 py-1.5 text-[11px] font-bold rounded-lg transition-all duration-200 ${
                currentStyle === key
                  ? "bg-blue-600 text-white shadow-md"
                  : "text-slate-400 hover:bg-slate-700 hover:text-white"
              }`}
            >
              {style.name}
            </button>
          ))}
        </div>

        {/* Toggle Oceano Azul */}
        <button
          onClick={() =>
            setColorMode(colorMode === "total" ? "ocean" : "total")
          }
          className={`px-3 py-2 text-[11px] font-bold rounded-xl shadow-lg border transition-all duration-300 flex items-center gap-1.5 ${
            colorMode === "ocean"
              ? "bg-sky-600 border-sky-400 text-white"
              : "bg-slate-900/80 border-slate-700 text-slate-400 hover:bg-slate-800"
          }`}
        >
          <span>🌊</span>{" "}
          {colorMode === "ocean"
            ? "Visão Oceano Azul Ativada"
            : "Filtrar Oceano Azul"}
        </button>
      </div>

      <div className="absolute inset-0 print:hidden">
        <DeckGL
          viewState={viewState}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onViewStateChange={(e: any) => setViewState(e.viewState)}
          controller={{ dragRotate: true, touchRotate: true }}
          onClick={handleMapClick}
          layers={layers}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          getCursor={({ isDragging }: any) =>
            isDragging ? "grabbing" : "crosshair"
          }
        >
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Map mapStyle={MAP_STYLES[currentStyle].url as any} />
        </DeckGL>
      </div>

      {/* PAINEL LATERAL ESQUERDO */}
      <div className="absolute top-6 left-6 bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl p-6 w-90 z-10 border border-slate-100 max-h-[90vh] overflow-y-auto flex flex-col custom-scrollbar print:relative print:top-0 print:left-0 print:w-full print:max-h-none print:shadow-none print:border-none print:p-0 print:block">
        <div className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                Conver<span className="text-blue-600">Geo</span>
              </h1>
              <p className="text-sm font-medium text-slate-500 mt-1 mb-5 print:mb-2">
                Inteligência Geoespacial 3D
              </p>
            </div>
            <div className="hidden print:block text-right">
              <p className="text-xs text-slate-400 font-mono">
                ID: {reportMeta.id}
              </p>
              <p className="text-xs text-slate-500 font-bold mt-1">
                Data: {reportMeta.date}
              </p>
            </div>
          </div>

          <div className="flex flex-col space-y-3 print:hidden">
            {/* NOVO: BARRA DE PESQUISA FLYTO */}
            <form onSubmit={handleAddressSearch} className="relative">
              <input
                type="text"
                placeholder="Pesquisar rua ou bairro..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 border border-slate-200 text-slate-800 text-xs rounded-lg pl-3 pr-10 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
              <button
                type="submit"
                disabled={isSearching}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600"
              >
                {isSearching ? (
                  <span className="animate-spin block">⏳</span>
                ) : (
                  "🔍"
                )}
              </button>
            </form>
            {searchError && (
              <p className="text-[10px] font-bold text-red-500 animate-fade-in">
                {searchError}
              </p>
            )}

            <div className="flex flex-col space-y-2 pt-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Qual negócio deseja abrir?
              </label>
              <select
                value={activeSegment}
                onChange={(e) => setActiveSegment(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full p-2 outline-none font-semibold shadow-sm"
              >
                <option value="food_service">
                  🍔 Restauração (Food Service)
                </option>
                <option value="farmacia">💊 Farmácia e Drogaria</option>
                <option value="vestuario">👕 Vestuário e Moda</option>
                <option value="clinica">🩺 Clínica Médica</option>
              </select>
            </div>

            <div className="bg-slate-50 rounded-lg border border-slate-200 overflow-hidden mt-1">
              <button
                onClick={() => setShowSliders(!showSliders)}
                className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-700 flex justify-between items-center hover:bg-slate-100"
              >
                <span>⚙️ Personalizar Motor IA</span>
                <span>{showSliders ? "▲" : "▼"}</span>
              </button>
              {showSliders && (
                <div className="p-3 space-y-3 border-t border-slate-200 bg-white">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 flex justify-between">
                      <span>Demografia (Censo)</span>{" "}
                      <span>{weightDemografia}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={weightDemografia}
                      onChange={(e) =>
                        setWeightDemografia(Number(e.target.value))
                      }
                      className="w-full h-1 bg-blue-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 flex justify-between">
                      <span>Mercado (Concorrência)</span>{" "}
                      <span>{weightMercado}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={weightMercado}
                      onChange={(e) => setWeightMercado(Number(e.target.value))}
                      className="w-full h-1 bg-amber-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 flex justify-between">
                      <span>Fluxo (Mobilidade)</span>{" "}
                      <span>{weightFluxo}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={weightFluxo}
                      onChange={(e) => setWeightFluxo(Number(e.target.value))}
                      className="w-full h-1 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 w-full mt-2">
              <button
                onClick={handleTop5Click}
                className={`font-bold py-2 px-1 text-[10px] rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1 ${viewMode === "top" ? "bg-blue-600 text-white" : "bg-slate-900 text-white hover:bg-slate-800"}`}
              >
                <span>🌟 Top 5</span>
              </button>
              <button
                onClick={handleHeatmapClick}
                className={`font-bold py-2 px-1 text-[10px] rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1 ${viewMode === "heatmap" ? "bg-purple-600 text-white" : "bg-slate-200 text-slate-800 hover:bg-slate-300"}`}
              >
                <span>🗺️ Raio-X Cidade</span>
              </button>
              <button
                onClick={handleCompareClick}
                className={`col-span-2 font-bold py-2 px-1 text-[10px] rounded-lg shadow-sm transition-colors flex items-center justify-center gap-1 ${viewMode === "compare" ? "bg-amber-500 text-white" : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"}`}
              >
                <span>⚖️ Iniciar Teste A/B</span>
              </button>
            </div>
          </div>
        </div>

        {/* ÁREA DINÂMICA DE RESULTADOS */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-3 print:hidden">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-slate-500 font-medium">
              A processar matriz H3...
            </p>
          </div>
        ) : viewMode === "heatmap" ? (
          <div className="space-y-4 animate-fade-in flex-1 flex flex-col text-center">
            <div className="bg-purple-50 border border-purple-100 p-4 rounded-xl">
              <span className="text-3xl mb-2 block">🔥</span>
              <h3 className="text-sm font-black text-purple-800 uppercase">
                Raio-X Ativado
              </h3>
              <p className="text-[11px] text-purple-600 mt-2 font-medium">
                Renderizando os 300 melhores pontos para o seu negócio em 3D.
              </p>

              {/* NOVO: FILTRO DINÂMICO DE HEATMAP */}
              <div className="mt-4 pt-3 border-t border-purple-200/50">
                <label className="text-[10px] font-bold text-purple-700 flex justify-between mb-1">
                  <span>Filtro de Nota Mínima:</span>
                  <span>{minHeatmapScore.toFixed(1)} / 10</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="9.5"
                  step="0.5"
                  value={minHeatmapScore}
                  onChange={(e) => setMinHeatmapScore(Number(e.target.value))}
                  className="w-full h-1 bg-purple-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
                />
              </div>
            </div>
            <div className="mt-auto pt-4 print:hidden">
              <button
                onClick={handleExportCSV}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-sm shadow-sm transition-all"
              >
                📊 Exportar Matriz (CSV)
              </button>
            </div>
          </div>
        ) : viewMode === "compare" ? (
          <div className="space-y-4 animate-fade-in flex-1 flex flex-col">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center print:text-left print:text-base">
              Teste A/B
            </h3>
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
                  <p className="text-[10px] font-bold text-slate-400 text-center uppercase tracking-wider mb-2">
                    Equilíbrio de Atributos
                  </p>
                  <svg viewBox="0 0 200 180" className="w-full h-40">
                    {[2, 4, 6, 8, 10].map((v) => (
                      <polygon
                        key={v}
                        points={`${getRadarPoint(v, 0)} ${getRadarPoint(v, 120)} ${getRadarPoint(v, 240)}`}
                        fill="none"
                        stroke="#e2e8f0"
                      />
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
                    <text
                      x="100"
                      y="12"
                      fontSize="10"
                      textAnchor="middle"
                      fill="#64748b"
                      fontWeight="bold"
                    >
                      Demografia
                    </text>
                    <text
                      x="180"
                      y="150"
                      fontSize="10"
                      textAnchor="middle"
                      fill="#64748b"
                      fontWeight="bold"
                    >
                      Mercado
                    </text>
                    <text
                      x="20"
                      y="150"
                      fontSize="10"
                      textAnchor="middle"
                      fill="#64748b"
                      fontWeight="bold"
                    >
                      Fluxo
                    </text>
                  </svg>
                </div>

                <div className="grid grid-cols-2 gap-3 flex-1 print:gap-8">
                  {hexData.slice(0, 2).map((hex, index) => {
                    const dynScore = getDynamicScore(hex);
                    const dynScoreOpponent = getDynamicScore(
                      hexData[index === 0 ? 1 : 0],
                    );
                    const isWinner = dynScore > dynScoreOpponent;

                    return (
                      <div
                        key={hex.h3_index}
                        className={`flex flex-col p-3 rounded-xl border-2 transition-all print:border print:p-5 ${isWinner ? "border-green-500 bg-green-50/50 shadow-md scale-[1.02] print:scale-100 print:bg-green-50/30" : "border-slate-200 bg-white opacity-90 print:opacity-100"}`}
                      >
                        {isWinner && (
                          <span className="text-[10px] font-black text-green-600 uppercase mb-1 text-center bg-green-100 rounded-sm py-0.5 print:text-sm print:bg-transparent print:border-b print:border-green-200 print:pb-2 print:mb-4">
                            Vencedor 🏆
                          </span>
                        )}
                        <p className="text-[11px] font-bold text-slate-700 leading-tight h-8 text-center flex items-center justify-center line-clamp-2 print:h-auto print:text-base print:mb-4">
                          {addressMap[hex.h3_index] || "A traduzir..."}
                        </p>
                        <div className="text-center my-2 border-y border-slate-100/50 py-2 print:border-none print:bg-slate-50 print:rounded-lg print:py-4">
                          <span
                            className={`text-2xl font-black ${isWinner ? "text-green-600" : "text-slate-800"} print:text-5xl`}
                          >
                            {dynScore.toFixed(1)}
                          </span>
                        </div>
                        <div className="space-y-2 mt-auto print:mt-6">
                          <p className="text-[9px] text-slate-500 flex justify-between print:text-xs">
                            <span>Demografia</span>{" "}
                            <span className="font-bold">
                              {hex.breakdown.estrutural.toFixed(1)}
                            </span>
                          </p>
                          <p className="text-[9px] text-slate-500 flex justify-between print:text-xs">
                            <span>Mercado</span>{" "}
                            <span className="font-bold">
                              {hex.breakdown.macroeconomico.toFixed(1)}
                            </span>
                          </p>
                          <p className="text-[9px] text-slate-500 flex justify-between print:text-xs">
                            <span>Fluxo</span>{" "}
                            <span className="font-bold">
                              {hex.breakdown.comportamental.toFixed(1)}
                            </span>
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : null}
          </div>
        ) : hexData.length === 1 && viewMode === "single" ? (
          <div className="space-y-4 animate-fade-in print:space-y-8">
            <div className="bg-blue-50 border border-blue-100 p-3 rounded-lg flex items-start gap-3 print:bg-transparent print:border-b print:border-slate-200 print:rounded-none print:pb-4">
              <span className="text-xl print:text-2xl">📍</span>
              <div>
                <p className="text-xs font-bold text-blue-600 uppercase print:text-sm">
                  Localização Analisada
                </p>
                <p className="text-sm font-bold text-slate-800 leading-tight print:text-xl">
                  {addressMap[hexData[0].h3_index] || "A pesquisar endereço..."}
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 flex justify-between items-center print:p-8">
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-1 print:text-sm">
                  Score ConverGeo
                </p>
                <div className="flex items-end gap-1">
                  <span className="text-4xl font-black text-slate-800 print:text-6xl">
                    {getDynamicScore(hexData[0]).toFixed(2)}
                  </span>
                  <span className="text-sm text-slate-400 mb-1 print:text-lg">
                    /10
                  </span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 print:text-sm">
                  Risco Geocomercial
                </p>
                <span
                  className={`text-xs font-bold px-2 py-1 rounded uppercase tracking-wide print:text-lg ${getBusinessMetrics(activeSegment, getDynamicScore(hexData[0])).riskColor}`}
                >
                  {
                    getBusinessMetrics(
                      activeSegment,
                      getDynamicScore(hexData[0]),
                    ).risk
                  }
                </span>
              </div>
            </div>

            {/* Raio-X de Concorrentes Visuais */}
            {competitorPins.length > 0 && (
              <div className="bg-red-50 border border-red-100 p-2 rounded-lg flex items-center justify-between animate-fade-in print:hidden">
                <span className="text-[10px] font-bold text-red-600 uppercase flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>{" "}
                  Raio-X Concorrência
                </span>
                <span className="text-[10px] text-red-500 font-medium">
                  {competitorPins.length} Concorrentes no mapa
                </span>
              </div>
            )}

            <div className="space-y-3 print:mt-10">
              <h3 className="text-[10px] font-bold text-slate-400 uppercase print:text-base">
                Projeção Financeira
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white border border-slate-100 p-2 rounded text-center print:border-slate-300 print:p-4">
                  <p className="text-[9px] text-slate-400 print:text-sm">
                    Investimento Estimado
                  </p>
                  <p className="text-xs font-bold print:text-lg">
                    {
                      getBusinessMetrics(
                        activeSegment,
                        getDynamicScore(hexData[0]),
                      ).investment
                    }
                  </p>
                </div>
                <div className="bg-white border border-slate-100 p-2 rounded text-center print:border-slate-300 print:p-4">
                  <p className="text-[9px] text-slate-400 print:text-sm">
                    Ponto de Equilíbrio (ROI)
                  </p>
                  <p className="text-xs font-bold text-green-500 print:text-lg">
                    {
                      getBusinessMetrics(
                        activeSegment,
                        getDynamicScore(hexData[0]),
                      ).roi
                    }
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 print:mt-10">
              <div className="flex flex-col bg-white border border-slate-100 p-3 rounded-lg shadow-sm print:shadow-none print:border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-slate-700 print:text-sm">
                    Demografia (Censo)
                  </span>
                  <span className="text-sm font-black text-blue-600 print:text-lg">
                    {hexData[0].breakdown.estrutural.toFixed(1)}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-blue-500 h-1.5 rounded-full"
                    style={{
                      width: `${(hexData[0].breakdown.estrutural / 10) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div className="flex flex-col bg-white border border-slate-100 p-3 rounded-lg shadow-sm print:shadow-none print:border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-slate-700 print:text-sm">
                    Saturação de Mercado
                  </span>
                  <span className="text-sm font-black text-amber-500 print:text-lg">
                    {hexData[0].breakdown.macroeconomico.toFixed(1)}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-amber-500 h-1.5 rounded-full"
                    style={{
                      width: `${(hexData[0].breakdown.macroeconomico / 10) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
              <div className="flex flex-col bg-white border border-slate-100 p-3 rounded-lg shadow-sm print:shadow-none print:border-slate-200">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs font-semibold text-slate-700 print:text-sm">
                    Infraestrutura e Fluxo
                  </span>
                  <span className="text-sm font-black text-purple-500 print:text-lg">
                    {hexData[0].breakdown.comportamental.toFixed(1)}
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5">
                  <div
                    className="bg-purple-500 h-1.5 rounded-full"
                    style={{
                      width: `${(hexData[0].breakdown.comportamental / 10) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-2 print:hidden">
              <button
                onClick={handlePrintPDF}
                className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm shadow-sm"
              >
                📄 Gerar PDF Executivo
              </button>
              <div className="flex gap-2">
                <button
                  onClick={handleShare}
                  className="flex-1 border border-slate-200 bg-white text-slate-700 font-bold py-2 rounded-lg text-[10px] hover:bg-slate-50"
                >
                  {copied ? "✅ Copiado!" : "🔗 Partilhar Dossiê"}
                </button>
                <button
                  onClick={handleExportCSV}
                  className="flex-1 border border-slate-200 bg-white text-slate-700 font-bold py-2 rounded-lg text-[10px] hover:bg-slate-50"
                >
                  📊 Exportar CSV
                </button>
              </div>
            </div>
          </div>
        ) : hexData.length > 1 && viewMode === "top" ? (
          <div className="space-y-3 animate-fade-in flex-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 print:text-base print:mb-6">
              Ranking de Oportunidades
            </h3>
            {hexData.map((hex, index) => (
              <div
                key={hex.h3_index}
                className="flex items-center p-3 bg-white border border-slate-100 rounded-xl shadow-sm hover:border-blue-300 transition-all cursor-default print:border-slate-300 print:mb-4"
              >
                <div
                  className={`min-w-8 h-8 rounded-full flex items-center justify-center text-white font-bold mr-3 print:w-10 print:h-10 print:text-lg ${index === 0 ? "bg-blue-600" : "bg-slate-300 print:bg-slate-400"}`}
                >
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold text-slate-700 leading-tight mb-1 print:text-base">
                    {addressMap[hex.h3_index] || "A procurar zona..."}
                  </p>
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-slate-400 font-mono print:text-xs">
                      H3: {hex.h3_index.substring(0, 6)}...
                    </p>
                    <p className="text-xs font-bold text-slate-600 print:text-sm">
                      Nota:{" "}
                      <span className="text-green-600 text-sm font-black print:text-base">
                        {getDynamicScore(hex).toFixed(2)}
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <div className="pt-2 flex flex-col gap-2 print:hidden">
              <button
                onClick={handleExportCSV}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg flex items-center justify-center gap-2 text-sm shadow-sm"
              >
                📊 Exportar Top 5 (CSV)
              </button>
            </div>
          </div>
        ) : (
          <div className="p-5 mt-auto bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center text-center">
            <p className="text-sm font-semibold text-slate-600 mb-1">
              Pronto para a Descoberta
            </p>
            <p className="text-[11px] text-slate-500">
              Clique no mapa, pesquise um endereço, ou use as ferramentas
              analíticas acima.
            </p>

            {searchHistory.length > 0 && (
              <div className="mt-6 w-full text-left animate-fade-in">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Buscas Recentes
                </p>
                <div className="flex flex-col gap-2">
                  {searchHistory.map((item, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setViewState((prev) => ({
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
                      <span
                        className="text-[11px] font-semibold text-slate-700 truncate mr-2"
                        title={item.name}
                      >
                        {item.name}
                      </span>
                      <span className="text-[10px] font-black text-blue-600 bg-blue-100 px-1.5 py-0.5 rounded">
                        {item.score.toFixed(1)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
