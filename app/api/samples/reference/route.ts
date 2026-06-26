import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const refs = await prisma.sample.findMany({
    where: { source: "REFERENCE" },
    select: { cxcl10: true, nox4: true },
    take: 500,
  });

  return NextResponse.json(refs);
}
