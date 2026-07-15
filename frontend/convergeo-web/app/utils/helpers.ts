// ============================================================================
// src/utils/helpers.ts
// Funções utilitárias puras do ConverGeo
// ============================================================================

export const getRadarPoint = (val: number, angle: number, cx = 100, cy = 90, rMax = 70) => {
  const rad = (angle - 90) * (Math.PI / 180);
  const r = (val / 10) * rMax;
  return `${cx + r * Math.cos(rad)},${cy + r * Math.sin(rad)}`;
};

export const getBusinessMetrics = (segment: string, score: number) => {
  let baseInv = 100000;
  if (segment === "food_service") baseInv = 150000;
  if (segment === "farmacia") baseInv = 300000;
  if (segment === "vestuario") baseInv = 80000;
  if (segment === "clinica") baseInv = 250000;

  const adjustedInv = baseInv * (1 + (score / 10) * 0.25);
  const formattedInv = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 }).format(adjustedInv);

  const roiMonths = score >= 8 ? 12 + Math.floor((10 - score) * 1.5) : score >= 5 ? 18 + Math.floor((8 - score) * 3) : 36 + Math.floor((5 - score) * 4);
  const riskLevel = score >= 7.5 ? "Baixo" : score >= 5 ? "Moderado" : "Alto";
  const riskColor = score >= 7.5 ? "text-green-600 bg-green-50" : score >= 5 ? "text-amber-500 bg-amber-50" : "text-red-500 bg-red-50";

  return { investment: formattedInv, roi: `${roiMonths} meses`, risk: riskLevel, riskColor };
};

export const getSegmentName = (val: string) => {
  const names: Record<string, string> = {
    food_service: "Restauração (Food Service)",
    farmacia: "Farmácia e Drogaria",
    vestuario: "Vestuário e Moda",
    clinica: "Clínica Médica",
  };
  return names[val] || val;
};
