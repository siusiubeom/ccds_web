import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const samples = await prisma.sample.findMany({
    where: { source: { in: ["USER", "IMPORT"] } },
    orderBy: { createdAt: "desc" },
    take: 200,
    select: {
      id: true, cxcl10: true, nox4: true, rbp4: true, ccdrOri: true,
      group: true, source: true, createdAt: true,
      user: { select: { email: true } },
    },
  });

  return NextResponse.json(samples);
}
