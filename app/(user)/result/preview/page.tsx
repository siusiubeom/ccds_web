"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import ResultCharts from "@/components/ResultCharts";
import type { RiskGroup } from "@/components/CssRiskBar";

interface RefPoint { cxcl10: number; nox4: number; }

function PreviewContent() {
  const params = useSearchParams();
  const cxcl10 = parseFloat(params.get("cxcl10") ?? "0");
  const nox4   = parseFloat(params.get("nox4")   ?? "0");
  const groupRaw = params.get("group");
  const group    = (groupRaw || null) as RiskGroup | null;

  const [refPoints, setRefPoints] = useState<RefPoint[]>([]);

  useEffect(() => {
    fetch("/api/samples/reference")
      .then(r => r.ok ? r.json() : [])
      .then(setRefPoints)
      .catch(() => {});
  }, []);

  const groupColor: Record<string, string> = {
    High:     "text-red-600 bg-red-50",
    Moderate: "text-orange-600 bg-orange-50",
    Normal:   "text-green-600 bg-green-50",
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Sample Result</h1>
        <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">← New Sample</Link>
      </div>

      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded text-sm">
        View-only — this sample was <strong>not saved</strong> to the database.
      </div>

      <p className="text-xs text-gray-400 border border-gray-200 rounded p-3 mb-6">
        For research/visualization only. Not a veterinary diagnosis. Consult a licensed veterinarian.
      </p>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6 grid grid-cols-2 gap-4 text-sm">
        <div><span className="text-gray-500">CXCL10:</span> <strong>{cxcl10}</strong></div>
        <div><span className="text-gray-500">NOX4:</span> <strong>{nox4}</strong></div>
        <div className="col-span-2">
          <span className="text-gray-500">Risk Group:</span>{" "}
          {group ? (
            <span className={`font-bold px-2 py-0.5 rounded ${groupColor[group] ?? ""}`}>{group}</span>
          ) : (
            <span className="font-bold text-gray-500">Unclassified</span>
          )}
        </div>
      </div>

      {group ? (
        <ResultCharts group={group} cxcl10={cxcl10} nox4={nox4} refPoints={refPoints} />
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-800 text-sm">
          <strong className="block mb-1">This sample does not fall within any defined risk category.</strong>
          The CXCL10 / NOX4 values are outside the ranges covered by the current risk model.
        </div>
      )}
    </div>
  );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-500">Loading…</div>}>
      <PreviewContent />
    </Suspense>
  );
}
