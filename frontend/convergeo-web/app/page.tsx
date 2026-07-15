// ============================================================================
// src/app/page.tsx
// Componente principal do ConverGeo (gestão de estado global)
// ============================================================================
"use client";

import React, { useState, useEffect } from "react";
import DeckGL from "@deck.gl/react";
import { H3HexagonLayer } from "@deck.gl/geo-layers";
import { ScatterplotLayer } from "@deck.gl/layers";
import { FlyToInterpolator } from "@deck.gl/core";
import { Map } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

import { MAP_STYLES, SearchHistoryItem } from "./utils/constants";

import Header from "./components/Header";
import MapControls from "./components/MapControls";
import FilterPanel from "./components/FilterPanel";
import ViewHeatmap from "./components/views/ViewHeatmap";
import ViewCompare from "./components/views/ViewCompare";
import ViewSingle from "./components/views/ViewSingle";
import ViewTop from "./components/views/ViewTop";
import ViewEmpty from "./components/views/ViewEmpty";

export default function App() {
  const [hexData, setHexData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentStyle, setCurrentStyle] =
    useState<keyof typeof MAP_STYLES>("dark");
  const [activeSegment, setActiveSegment] = useState("food_service");

  const [viewState, setViewState] = useState({
    longitude: -38.4813,
    latitude: -12.9515,
    zoom: 12.5,
    pitch: 0,
    bearing: 0,
  });
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

  const [searchQuery, setSearchQuery] = useState("");
  const [searchError, setSearchError] = useState("");
  const [isSearching, setIsSearching] = useState(false);

  const [colorMode, setColorMode] = useState<"total" | "ocean">("total");
  const [minHeatmapScore, setMinHeatmapScore] = useState(0);
  const [competitorPins, setCompetitorPins] = useState<
    { lat: number; lng: number }[]
  >([]);

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
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery + ", Salvador, Bahia")}&limit=1`,
      );
      const data = await res.json();
      if (data && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lng = parseFloat(data[0].lon);
        setViewState((prev: any) => ({
          ...prev,
          longitude: lng,
          latitude: lat,
          zoom: 15,
          pitch: 45,
          transitionDuration: 2500,
          transitionInterpolator: new FlyToInterpolator(),
        }));
        setLastCoordinate({ lat, lng });
        setViewMode("single");
        setSearchQuery("");
      } else {
        setSearchError("Endereço não encontrado.");
        setTimeout(() => setSearchError(""), 4000);
      }
    } catch (err) {
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
          const data = await res.json();
          setHexData(data.status === "sucesso" ? data.recomendacoes : []);
        } else if (viewMode === "top") {
          const res = await fetch(
            `${baseUrl}/top?segmento=${activeSegment}&limit=5`,
          );
          const data = await res.json();
          setHexData(data.status === "sucesso" ? data.recomendacoes : []);
        } else if (viewMode === "single" && lastCoordinate) {
          const res = await fetch(
            `${baseUrl}/score?lat=${lastCoordinate.lat}&lng=${lastCoordinate.lng}&segmento=${activeSegment}`,
          );
          const data = await res.json();
          const singleHex = data.status === "sucesso" ? [data] : [];
          setHexData(singleHex);

          if (singleHex.length > 0) {
            const macroScore = singleHex[0].breakdown?.macroeconomico || 0;
            const numPins = Math.max(0, Math.floor((10 - macroScore) * 2.5));
            const pins = [];
            for (let i = 0; i < numPins; i++) {
              const radius = 0.005 * Math.sqrt(Math.random());
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

  const handleExportCSV = () => {
    const headers = [
      "ID_H3",
      "Localizacao",
      "Nota_Personalizada",
      "Demografia",
      "Saturacao_Mercado",
      "Fluxo",
    ];
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

  const visibleHexData =
    viewMode === "heatmap"
      ? hexData.filter((d) => getDynamicScore(d) >= minHeatmapScore)
      : hexData;

  const layers = [
    new H3HexagonLayer({
      id: "h3-hexagon-layer",
      data: visibleHexData,
      pickable: true,
      extruded: true,
      elevationScale: 50,
      stroked: true,
      filled: true,
      lineWidthMinPixels: 1,
      coverage: 0.95,
      getHexagon: (d: any) => d.h3_index,
      getElevation: (d: any) => getDynamicScore(d) * 10,
      getFillColor: (d: any) => {
        if (colorMode === "ocean") {
          const s = d.breakdown?.macroeconomico || 0;
          return s >= 7
            ? [14, 165, 233, 200]
            : s >= 4
              ? [168, 85, 247, 200]
              : [239, 68, 68, 200];
        }
        const s = getDynamicScore(d);
        return s >= 7
          ? [16, 185, 129, 200]
          : s >= 4
            ? [245, 158, 11, 200]
            : [239, 68, 68, 200];
      },
      getLineColor: () => [255, 255, 255, 50],
      updateTriggers: {
        getElevation: [weightDemografia, weightMercado, weightFluxo],
        getFillColor: [weightDemografia, weightMercado, weightFluxo, colorMode],
      },
    }),
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
      getPosition: (d: any) => [d.lng, d.lat],
      getFillColor: [239, 68, 68],
      getLineColor: [255, 255, 255],
    }),
  ];

  return (
    <main className="w-full h-screen relative overflow-hidden bg-slate-900 print:bg-white print:h-auto print:overflow-visible">
      <link
        href="https://unpkg.com/maplibre-gl@3.x/dist/maplibre-gl.css"
        rel="stylesheet"
      />

      <MapControls
        currentStyle={currentStyle}
        setCurrentStyle={setCurrentStyle}
        colorMode={colorMode}
        setColorMode={setColorMode}
      />

      <div className="absolute inset-0 print:hidden">
        <DeckGL
          viewState={viewState}
          onViewStateChange={(e: any) => setViewState(e.viewState)}
          controller={{ dragRotate: true, touchRotate: true }}
          onClick={handleMapClick}
          layers={layers}
          getCursor={({ isDragging }: any) =>
            isDragging ? "grabbing" : "crosshair"
          }
        >
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <Map mapStyle={MAP_STYLES[currentStyle].url as any} />
        </DeckGL>
      </div>

      <div className="absolute top-6 left-6 bg-white/95 backdrop-blur-md shadow-2xl rounded-2xl p-6 w-90 z-10 border border-slate-100 max-h-[90vh] overflow-y-auto flex flex-col custom-scrollbar print:relative print:top-0 print:left-0 print:w-full print:max-h-none print:shadow-none print:border-none print:p-0 print:block">
        <Header reportMeta={reportMeta} />

        <FilterPanel
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          handleAddressSearch={handleAddressSearch}
          isSearching={isSearching}
          searchError={searchError}
          activeSegment={activeSegment}
          setActiveSegment={setActiveSegment}
          showSliders={showSliders}
          setShowSliders={setShowSliders}
          weightDemografia={weightDemografia}
          setWeightDemografia={setWeightDemografia}
          weightMercado={weightMercado}
          setWeightMercado={setWeightMercado}
          weightFluxo={weightFluxo}
          setWeightFluxo={setWeightFluxo}
          viewMode={viewMode}
          handleTop5Click={() => {
            setViewMode("top");
            setCompetitorPins([]);
          }}
          handleHeatmapClick={() => {
            setViewMode("heatmap");
            setCompetitorPins([]);
          }}
          handleCompareClick={() => {
            setViewMode("compare");
            setCompareLocations([]);
            setHexData([]);
            setCompetitorPins([]);
          }}
        />

        {loading ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-3 print:hidden">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm text-slate-500 font-medium">
              A processar matriz H3...
            </p>
          </div>
        ) : viewMode === "heatmap" ? (
          <ViewHeatmap
            minHeatmapScore={minHeatmapScore}
            setMinHeatmapScore={setMinHeatmapScore}
            handleExportCSV={handleExportCSV}
          />
        ) : viewMode === "compare" ? (
          <ViewCompare
            compareLocations={compareLocations}
            hexData={hexData}
            addressMap={addressMap}
            getDynamicScore={getDynamicScore}
            handlePrintPDF={() => window.print()}
            handleCompareClick={() => {
              setViewMode("compare");
              setCompareLocations([]);
              setHexData([]);
              setCompetitorPins([]);
            }}
            handleShare={handleShare}
            copied={copied}
          />
        ) : hexData.length === 1 && viewMode === "single" ? (
          <ViewSingle
            hexData={hexData}
            addressMap={addressMap}
            getDynamicScore={getDynamicScore}
            activeSegment={activeSegment}
            competitorPins={competitorPins}
            handlePrintPDF={() => window.print()}
            handleShare={handleShare}
            handleExportCSV={handleExportCSV}
            copied={copied}
          />
        ) : hexData.length > 1 && viewMode === "top" ? (
          <ViewTop
            hexData={hexData}
            addressMap={addressMap}
            getDynamicScore={getDynamicScore}
            handleExportCSV={handleExportCSV}
            activeSegment={activeSegment}
          />
        ) : (
          <ViewEmpty
            searchHistory={searchHistory}
            setViewState={setViewState}
            setLastCoordinate={setLastCoordinate}
            setViewMode={setViewMode}
          />
        )}
      </div>
    </main>
  );
}
