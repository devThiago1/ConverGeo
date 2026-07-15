// ============================================================================
// src/components/Header.tsx
// ============================================================================
"use client";

import React from "react";

interface HeaderProps {
  reportMeta: { id: string; date: string };
}

export default function Header({ reportMeta }: HeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Conver<span className="text-blue-600">Geo</span>
          </h1>
          <p className="text-sm font-medium text-slate-500 mt-1 mb-5 print:mb-2">Inteligência Geoespacial 3D</p>
        </div>
        <div className="hidden print:block text-right">
          <p className="text-xs text-slate-400 font-mono">ID: {reportMeta.id}</p>
          <p className="text-xs text-slate-500 font-bold mt-1">Data: {reportMeta.date}</p>
        </div>
      </div>
    </div>
  );
}
