import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const token = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  await prisma.keepAlive.create({ data: { token } });

  const total = await prisma.keepAlive.count();
  await prisma.keepAlive.deleteMany({
    where: { pingedAt: { lt: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) } },
  });

  return NextResponse.json({ ok: true, token, total });
}
