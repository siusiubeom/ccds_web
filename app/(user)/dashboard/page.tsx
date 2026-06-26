"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardPage() {
  const router = useRouter();
  const [cxcl10, setCxcl10] = useState("");
  const [nox4, setNox4] = useState("");
  const [rbp4, setRbp4] = useState("");
  const [ccdrOri, setCcdrOri] = useState("");
  const [saveToDB, setSaveToDB] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const body: Record<string, number | boolean> = {
      cxcl10: parseFloat(cxcl10),
      nox4: parseFloat(nox4),
      save: saveToDB,
    };
    if (rbp4) body.rbp4 = parseFloat(rbp4);
    if (ccdrOri) body.ccdrOri = parseInt(ccdrOri, 10);

    const res = await fetch("/api/samples", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setLoading(false);

    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Submission failed.");
      return;
    }

    const data = await res.json();
    if (data.id) {
      router.push(`/result/${data.id}`);
    } else {
      // Not saved — show result inline via query params
      router.push(`/result/preview?cxcl10=${cxcl10}&nox4=${nox4}&group=${data.group}`);
    }
  }

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold mb-6">Submit Biomarker Sample</h1>
      <p className="text-xs text-gray-400 border border-gray-200 rounded p-3 mb-6">
        For research/visualization only. Not a veterinary diagnosis. Consult a licensed veterinarian.
      </p>
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4">
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="cxcl10">CXCL10 *</label>
          <input
            id="cxcl10"
            type="number"
            step="any"
            value={cxcl10}
            onChange={e => setCxcl10(e.target.value)}
            required
            placeholder="e.g. 767.230"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="nox4">NOX4 *</label>
          <input
            id="nox4"
            type="number"
            step="any"
            value={nox4}
            onChange={e => setNox4(e.target.value)}
            required
            placeholder="e.g. 9.99"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="rbp4">RBP4 (optional)</label>
          <input
            id="rbp4"
            type="number"
            step="any"
            value={rbp4}
            onChange={e => setRbp4(e.target.value)}
            placeholder="optional"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1" htmlFor="ccdrOri">CCDR (optional)</label>
          <input
            id="ccdrOri"
            type="number"
            step="1"
            value={ccdrOri}
            onChange={e => setCcdrOri(e.target.value)}
            placeholder="optional integer"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <label className="flex items-start gap-3 cursor-pointer select-none">
          <div className="relative mt-0.5">
            <input
              type="checkbox"
              checked={saveToDB}
              onChange={e => setSaveToDB(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-10 h-6 rounded-full bg-gray-200 peer-checked:bg-blue-600 transition-colors" />
            <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
          </div>
          <div>
            <span className="text-sm font-medium">{saveToDB ? "Save to database" : "View only (not saved)"}</span>
            <p className="text-xs text-gray-400 mt-0.5">
              {saveToDB
                ? "Your sample will be stored and contribute to research data."
                : "Results are shown but no data is stored."}
            </p>
          </div>
        </label>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-60"
        >
          {loading ? "Submitting…" : "Submit Sample"}
        </button>
      </form>
    </div>
  );
}
