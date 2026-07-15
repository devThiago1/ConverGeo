// ============================================================================
// src/components/ScoreProgressBar.tsx
// ============================================================================
"use client";

import React from "react";

interface ScoreProgressBarProps {
  label: string;
  value: number;
  colorClass: string;
}

export default function ScoreProgressBar({ label, value, colorClass }: ScoreProgressBarProps) {
  return (
    <div className="flex flex-col bg-white border border-slate-100 p-3 rounded-lg shadow-sm print:shadow-none print:border-slate-200">
      <div className="flex justify-between items-center mb-2">
        <span className="text-xs font-semibold text-slate-700 print:text-sm">{label}</span>
        <span className={`text-sm font-black print:text-lg ${colorClass.replace("bg-", "text-")}`}>{value.toFixed(1)}</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-1.5">
        <div className={`${colorClass} h-1.5 rounded-full`} style={{ width: `${(value / 10) * 100}%` }}></div>
      </div>
    </div>
  );
}
