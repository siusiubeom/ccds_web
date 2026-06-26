import { prisma } from "@/lib/prisma";

export default async function AdminModelsPage() {
  const models = await prisma.riskModel.findMany({ orderBy: { version: "desc" } });

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold mb-2">Risk Models</h1>
      <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
        <strong>Model updates are coming later.</strong> Data is currently being collected via Prisma.
        Once sufficient data is available, threshold editing and model retraining will be enabled here.
      </div>

      {models.length === 0 ? (
        <p className="text-gray-500">No risk models configured yet. Data collection is in progress.</p>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3">Version</th>
                <th className="text-left px-4 py-3">Active</th>
                <th className="text-left px-4 py-3">Note</th>
                <th className="text-left px-4 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {models.map(m => (
                <tr key={m.id} className="border-b last:border-0">
                  <td className="px-4 py-3">v{m.version}</td>
                  <td className="px-4 py-3">{m.active ? "Yes" : "No"}</td>
                  <td className="px-4 py-3">{m.note ?? "—"}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(m.createdAt).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
