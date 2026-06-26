import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    where: { role: "USER" },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true, status: true, role: true, createdAt: true },
  });

  return NextResponse.json(users);
}
