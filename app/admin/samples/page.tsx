"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Sample {
  id: string;
  cxcl10: number;
  nox4: number;
  rbp4: number | null;
  ccdrOri: number | null;
  group: string | null;
  source: string;
  createdAt: string;
  user: { email: string } | null;
}

const groupColor: Record<string, string> = {
  High:     "bg-red-100 text-red-700",
  Moderate: "bg-orange-100 text-orange-700",
  Normal:   "bg-green-100 text-green-700",
};

export default function AdminSamplesPage() {
  const [samples, setSamples]     = useState<Sample[]>([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [importMsg, setImportMsg] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError("");
    fetch("/api/admin/samples")
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((data: Sample[]) => { setSamples(data); setLoading(false); })
      .catch(e => { setError(String(e)); setLoading(false); });
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleDelete(id: string) {
    setDeleting(id);
    await fetch(`/api/admin/samples/${id}`, { method: "DELETE" });
    load();
    setDeleting(null);
  }

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportMsg("");
    const body = new FormData();
    body.append("file", file);
    const res = await fetch("/api/admin/samples/import", { method: "POST", body });
    const data = await res.json();
    setImportMsg(res.ok
      ? `Imported ${data.imported} rows. Skipped ${data.skipped}.`
      : `Error: ${data.error}`);
    if (res.ok) load();
    setImporting(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">Samples</h1>
        <div className="flex items-center gap-3">
          {importMsg && <span className="text-sm text-gray-600">{importMsg}</span>}
          <label className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer border ${
            importing
              ? "opacity-50 cursor-not-allowed bg-gray-100 border-gray-200 text-gray-500"
              : "bg-blue-600 text-white border-blue-600 hover:bg-blue-700"
          }`}>
            {importing ? "Importing…" : "Import CSV"}
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              disabled={importing}
              onChange={handleImport}
            />
          </label>
        </div>
      </div>

      <p className="text-xs text-gray-400 mb-4">
        Required CSV columns: <code className="bg-gray-100 px-1 rounded">cxcl10</code>,{" "}
        <code className="bg-gray-100 px-1 rounded">nox4</code> · Optional:{" "}
        <code className="bg-gray-100 px-1 rounded">rbp4</code>,{" "}
        <code className="bg-gray-100 px-1 rounded">ccdr_ori</code>,{" "}
        <code className="bg-gray-100 px-1 rounded">label</code>
      </p>

      {loading && <p className="text-gray-500">Loading…</p>}
      {error   && <p className="text-red-600 text-sm">Failed to load: {error}</p>}

      {!loading && !error && samples.length === 0 && (
        <p className="text-gray-500">No user or imported samples yet.</p>
      )}

      {!loading && samples.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3">User</th>
                <th className="text-left px-4 py-3">CXCL10</th>
                <th className="text-left px-4 py-3">NOX4</th>
                <th className="text-left px-4 py-3">RBP4</th>
                <th className="text-left px-4 py-3">CCDR</th>
                <th className="text-left px-4 py-3">Group</th>
                <th className="text-left px-4 py-3">Source</th>
                <th className="text-left px-4 py-3">Date</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {samples.map(s => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-gray-50">
                  <td className="px-4 py-3 text-xs text-gray-500 max-w-[120px] truncate">
                    {s.user?.email ?? "—"}
                  </td>
                  <td className="px-4 py-3">{s.cxcl10}</td>
                  <td className="px-4 py-3">{s.nox4}</td>
                  <td className="px-4 py-3">{s.rbp4 ?? "—"}</td>
                  <td className="px-4 py-3">{s.ccdrOri ?? "—"}</td>
                  <td className="px-4 py-3">
                    {s.group ? (
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${groupColor[s.group] ?? ""}`}>
                        {s.group}
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      s.source === "IMPORT"    ? "bg-purple-100 text-purple-700" :
                      s.source === "USER"      ? "bg-blue-100 text-blue-700" :
                      s.source === "REFERENCE" ? "bg-gray-100 text-gray-600" :
                      "bg-gray-50 text-gray-500"
                    }`}>{s.source}</span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                    {new Date(s.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(s.id)}
                      disabled={deleting === s.id}
                      className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-40"
                    >
                      {deleting === s.id ? "…" : "Delete"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-400 px-4 py-2 border-t">
            Showing up to 200 most recent samples.
          </p>
        </div>
      )}
    </div>
  );
}
