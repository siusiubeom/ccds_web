import { prisma } from "@/lib/prisma";

export default async function AdminHomePage() {
  const [totalUsers, pendingUsers, totalSamples] = await Promise.all([
    prisma.user.count({ where: { role: "USER" } }),
    prisma.user.count({ where: { status: "PENDING" } }),
    prisma.sample.count({ where: { source: "USER" } }),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Admin Dashboard</h1>
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Users" value={totalUsers} />
        <StatCard label="Pending Approval" value={pendingUsers} accent={pendingUsers > 0} />
        <StatCard label="User Samples" value={totalSamples} />
      </div>
    </div>
  );
}

function StatCard({ label, value, accent = false }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm p-6 ${accent ? "border-2 border-orange-400" : ""}`}>
      <div className="text-3xl font-bold">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{label}</div>
    </div>
  );
}
