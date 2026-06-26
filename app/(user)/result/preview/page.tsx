"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import ResultCharts from "@/components/ResultCharts";
import type { RiskGroup } from "@/components/CssRiskBar";

function PreviewContent() {
  const params = useSearchParams();
  const cxcl10 = parseFloat(params.get("cxcl10") ?? "0");
  const nox4   = parseFloat(params.get("nox4")   ?? "0");
  const group  = (params.get("group") ?? "Normal") as RiskGroup;

  const groupColor: Record<string, string> = {
    High: "text-red-600 bg-red-50",
    Moderate: "text-orange-600 bg-orange-50",
    Normal: "text-green-600 bg-green-50",
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
          <span className={`font-bold px-2 py-0.5 rounded ${groupColor[group] ?? ""}`}>{group}</span>
        </div>
      </div>

      <ResultCharts group={group} cxcl10={cxcl10} nox4={nox4} refPoints={[]} />
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
