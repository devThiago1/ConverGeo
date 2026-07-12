"use client";

import React, { useState, useEffect } from "react";

// ============================================================================
// ATENÇÃO: PARA COPIAR PARA O SEU VS CODE LOCAL (NEXT.JS)
// ============================================================================
// Para evitar o erro do Turbopack no seu computador:
// 1. APAGUE as três importações "https://esm.sh/..." abaixo.
// 2. APAGUE a tag <link href="..."> que está dentro do <main>.
// 3. DESCOMENTE as quatro linhas nativas seguintes:
//
import DeckGL from "@deck.gl/react";
/// /  @ts-ignore
import { H3HexagonLayer } from "@deck.gl/geo-layers";
import { Map } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
// ============================================================================

// --- IMPORTAÇÕES OBRIGATÓRIAS APENAS PARA A PRÉ-VISUALIZAÇÃO DESTA PLATAFORMA ---
// import DeckGL from "https://esm.sh/@deck.gl/react@8.9.3?deps=react@18.2.0";
// import { H3HexagonLayer } from "https://esm.sh/@deck.gl/geo-layers@8.9.3?deps=react@18.2.0";
// import { Map } from "https://esm.sh/react-map-gl@7.1.7/maplibre?deps=react@18.2.0,maplibre-gl@3.6.2";

// Dicionário de Estilos de Mapa
const MAP_STYLES = {
  positron: {
    name: "Claro",
    url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
  },
  dark: {
    name: "Escuro",
    url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  },
  voyager: {
    name: "Ruas",
    url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
  },
  satellite: {
    name: "Satélite",
    url: {
      version: 8,
      sources: {
        "raster-tiles": {
          type: "raster",
          tiles: [
            "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
          ],
          tileSize: 256,
          attribution: "Esri, Maxar, Earthstar Geographics",
        },
      },
      layers: [
        {
          id: "simple-tiles",
          type: "raster",
          source: "raster-tiles",
          minzoom: 0,
          maxzoom: 22,
        },
      ],
    },
  },
};

// Centrado em Salvador, Bahia (Vista 2D de topo)
const INITIAL_VIEW_STATE = {
  longitude: -38.4813,
  latitude: -12.9515,
  zoom: 12.5,
  pitch: 0, // <-- Removido o efeito 3D da câmara
  bearing: 0,
};

export default function App() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [hexData, setHexData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentStyle, setCurrentStyle] =
    useState<keyof typeof MAP_STYLES>("positron");

  // NOVOS ESTADOS PARA O SELETOR DE SEGMENTO
  const [activeSegment, setActiveSegment] = useState("food_service");
  const [lastCoordinate, setLastCoordinate] = useState<{
    lat: number;
    lng: number;
  } | null>(null);

  // Efeito unificado que dispara a busca sempre que a coordenada ou o segmento mudam
  // Esta abordagem limpa resolve os erros de linting do React Hooks
  useEffect(() => {
    if (!lastCoordinate) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `https://convergeo.onrender.com/score?lat=${lastCoordinate.lat}&lng=${lastCoordinate.lng}&segmento=${activeSegment}`,
        );
        const data = await res.json();
        setHexData(data);
      } catch (error) {
        console.error("Erro na API do ConverGeo:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [lastCoordinate, activeSegment]);

  // Função disparada ao clicar no mapa
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleMapClick = (info: any) => {
    if (!info.coordinate) return;

    // O Deck.gl retorna [longitude, latitude]
    const [lng, lat] = info.coordinate;

    // Guarda a última coordenada clicada (o useEffect fará o fetch automaticamente)
    setLastCoordinate({ lat, lng });
  };

  // A Camada que processa o seu hexágono (AGORA EM 2D PLANO)
  const layers = [
    new H3HexagonLayer({
      id: "h3-hexagon-layer",
      data: hexData ? [hexData] : [],
      pickable: true,
      extruded: false, // <-- Desliga completamente o 3D
      stroked: true, // <-- Adiciona uma linha de contorno
      filled: true, // <-- Preenche o interior do hexágono
      lineWidthMinPixels: 3, // <-- Espessura da linha de contorno
      coverage: 0.95, // <-- Preenche quase todo o espaço da célula

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getHexagon: (d: any) => d.h3_index,

      // Cor do hexágono com base na nota final (ligeiramente mais transparente para ver as ruas)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getFillColor: (d: any) => {
        if (d.score_total >= 7) return [16, 185, 129, 160]; // Verde Esmeralda
        if (d.score_total >= 4) return [245, 158, 11, 160]; // Âmbar
        return [239, 68, 68, 160]; // Vermelho suave
      },

      // Cor da linha de contorno (mais forte para destacar a área)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      getLineColor: (d: any) => {
        if (d.score_total >= 7) return [16, 185, 129, 255];
        if (d.score_total >= 4) return [245, 158, 11, 255];
        return [239, 68, 68, 255];
      },
    }),
  ];

  return (
    <main className="w-full h-screen relative overflow-hidden bg-slate-50">
      {/* OBRIGATÓRIO PARA A PRÉ-VISUALIZAÇÃO (APAGUE NO VS CODE E USE O IMPORT DE CSS NATIVO) */}
      <link
        href="https://unpkg.com/maplibre-gl@3.x/dist/maplibre-gl.css"
        rel="stylesheet"
      />

      {/* SELETOR DE ESTILO DO MAPA */}
      <div className="absolute top-6 right-6 bg-white/95 backdrop-blur-md shadow-lg rounded-xl p-1.5 z-20 border border-slate-100 flex space-x-1">
        {Object.entries(MAP_STYLES).map(([key, style]) => (
          <button
            key={key}
            onClick={() => setCurrentStyle(key as keyof typeof MAP_STYLES)}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
              currentStyle === key
                ? "bg-blue-600 text-white shadow-md"
                : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            }`}
          >
            {style.name}
          </button>
        ))}
      </div>

      <DeckGL
        initialViewState={INITIAL_VIEW_STATE}
        controller={true}
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

      {/* PAINEL LATERAL DE RESULTADOS */}
      <div className="absolute top-6 left-6 bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl p-6 w-80 z-10 border border-slate-100 max-h-[90vh] overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Conver<span className="text-blue-600">Geo</span>
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1 mb-5">
            Inteligência de Mercado H3
          </p>

          {/* NOVO: SELETOR DE SEGMENTO DE NEGÓCIO */}
          <div className="flex flex-col space-y-2">
            <label
              htmlFor="segmento"
              className="text-xs font-bold text-slate-500 uppercase tracking-wider"
            >
              Qual negócio deseja abrir?
            </label>
            <select
              id="segmento"
              value={activeSegment}
              onChange={(e) => setActiveSegment(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-sm rounded-lg focus:ring-blue-600 focus:border-blue-600 block w-full p-2.5 outline-none transition-all cursor-pointer font-semibold shadow-sm hover:border-blue-300"
            >
              <option value="food_service">
                🍔 Restauração (Food Service)
              </option>
              <option value="farmacia">💊 Farmácia e Drogaria</option>
              <option value="vestuario">👕 Vestuário e Moda</option>
              <option value="clinica">🩺 Clínica Médica</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-slate-500 font-medium">
              A analisar viabilidade...
            </p>
          </div>
        ) : hexData && hexData.status === "sucesso" ? (
          <div className="space-y-5 animate-fade-in">
            {/* Score Total */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">
                Score Total
              </p>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-black text-slate-800">
                  {hexData.score_total.toFixed(2)}
                </span>
                <span className="text-sm font-medium text-slate-400 mb-1">
                  / 10
                </span>
              </div>
            </div>

            {/* Breakdown dos Parâmetros com Explicações */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Detalhamento da Nota
              </h3>

              {/* Estrutural */}
              <div className="flex flex-col bg-white border border-slate-100 p-3 rounded-lg shadow-sm hover:border-blue-200 transition-colors">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-semibold text-slate-600">
                    Estrutural
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {hexData.breakdown.estrutural.toFixed(2)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Baseado na densidade populacional e rendimento (Censo IBGE).
                  Mede o potencial de consumo local.
                </p>
              </div>

              {/* Macroeconómico */}
              <div className="flex flex-col bg-white border border-slate-100 p-3 rounded-lg shadow-sm hover:border-blue-200 transition-colors">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-semibold text-slate-600">
                    Macroeconómico
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {hexData.breakdown.macroeconomico.toFixed(2)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Mede a saturação do mercado (Receita Federal). Notas altas
                  indicam pouca concorrência (Oceano Azul).
                </p>
              </div>

              {/* Comportamental */}
              <div className="flex flex-col bg-white border border-slate-100 p-3 rounded-lg shadow-sm hover:border-blue-200 transition-colors">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-semibold text-slate-600">
                    Comportamental
                  </span>
                  <span className="text-sm font-bold text-slate-800">
                    {hexData.breakdown.comportamental.toFixed(2)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Avalia o fluxo orgânico de pessoas gerado por infraestrutura
                  urbana próxima (escolas, hospitais via OSM).
                </p>
              </div>

              <p className="text-[10px] text-slate-300 text-center mt-4">
                Índice Uber H3: {hexData.h3_index}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-5 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 flex flex-col items-center text-center">
            <svg
              className="w-8 h-8 text-slate-400 mb-2"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122"
              ></path>
            </svg>
            <p className="text-sm font-semibold text-slate-600">
              Clique no mapa
            </p>
            <p className="text-xs text-slate-500 mt-1">
              Selecione uma região para calcular o score e ver os detalhes.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
