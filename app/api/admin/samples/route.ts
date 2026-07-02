import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const source = req.nextUrl.searchParams.get("source"); // USER | IMPORT | REFERENCE | (empty = all)

  const samples = await prisma.sample.findMany({
    where: source ? { source: source as "USER" | "IMPORT" | "REFERENCE" } : undefined,
    orderBy: { createdAt: "desc" },
    take: 500,
    select: {
      id: true, cxcl10: true, nox4: true, rbp4: true, ccdrOri: true,
      group: true, source: true, createdAt: true,
      user: { select: { email: true } },
    },
  });

  return NextResponse.json(samples);
}
