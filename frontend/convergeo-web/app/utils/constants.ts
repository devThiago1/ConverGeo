// ============================================================================
// src/utils/constants.ts
// Constantes e interfaces compartilhadas do ConverGeo
// ============================================================================

export const MAP_STYLES = {
  dark: { name: "Escuro (Recomendado)", url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json" },
  positron: { name: "Claro", url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json" },
  voyager: { name: "Ruas", url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json" },
};

export interface SearchHistoryItem {
  h3_index: string;
  name: string;
  score: number;
  lat: number;
  lng: number;
}
