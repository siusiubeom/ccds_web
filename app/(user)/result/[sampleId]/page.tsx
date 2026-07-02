import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import ResultCharts from "@/components/ResultCharts";
import type { RiskGroup } from "@/components/CssRiskBar";

export default async function ResultPage({
  params,
}: {
  params: Promise<{ sampleId: string }>;
}) {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") redirect("/login");

  const { sampleId } = await params;
  const sample = await prisma.sample.findUnique({
    where: { id: sampleId },
    select: { id: true, cxcl10: true, nox4: true, rbp4: true, ccdrOri: true, group: true, createdAt: true, userId: true },
  });

  if (!sample || (session.user.role !== "ADMIN" && sample.userId !== session.user.id)) {
    notFound();
  }

  const refs = await prisma.sample.findMany({
    where: { source: "REFERENCE" },
    select: { cxcl10: true, nox4: true },
    take: 500,
  });

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

      <p className="text-xs text-gray-400 border border-gray-200 rounded p-3 mb-6">
        For research/visualization only. Not a veterinary diagnosis. Consult a licensed veterinarian.
      </p>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6 grid grid-cols-2 gap-4 text-sm">
        <div><span className="text-gray-500">CXCL10:</span> <strong>{sample.cxcl10}</strong></div>
        <div><span className="text-gray-500">NOX4:</span> <strong>{sample.nox4}</strong></div>
        {sample.rbp4 != null && <div><span className="text-gray-500">RBP4:</span> <strong>{sample.rbp4}</strong></div>}
        {sample.ccdrOri != null && <div><span className="text-gray-500">CCDR:</span> <strong>{sample.ccdrOri}</strong></div>}
        <div className="col-span-2">
          <span className="text-gray-500">Risk Group:</span>{" "}
          <span className={`font-bold px-2 py-0.5 rounded ${groupColor[sample.group ?? ""] ?? ""}`}>
            {sample.group ?? "Unknown"}
          </span>
        </div>
        <div className="col-span-2 text-gray-400 text-xs">
          Submitted: {new Date(sample.createdAt).toLocaleString()}
        </div>
      </div>

      {sample.group ? (
        <ResultCharts
          group={sample.group as RiskGroup}
          cxcl10={sample.cxcl10}
          nox4={sample.nox4}
          refPoints={refs}
        />
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-800 text-sm">
          <strong className="block mb-1">This sample does not fall within any defined risk category.</strong>
          The CXCL10 / NOX4 values are outside the ranges covered by the current risk model.
          The sample has been stored for future model updates.
        </div>
      )}
    </div>
  );
}
