import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { classify } from "@/lib/risk";
import { z } from "zod";

const schema = z.object({
  cxcl10: z.number().positive(),
  nox4: z.number().positive(),
  rbp4: z.number().positive().optional(),
  ccdrOri: z.number().int().optional(),
  save: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.status !== "APPROVED") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { cxcl10, nox4, rbp4, ccdrOri, save } = parsed.data;
  const result = classify(cxcl10, nox4);
  if (!result) {
    return NextResponse.json(
      { error: "Sample does not fit any risk category. Please check your values." },
      { status: 422 }
    );
  }

  if (!save) {
    // Classification only — no DB write
    return NextResponse.json({ id: null, group: result.group, saved: false }, { status: 200 });
  }

  const sample = await prisma.sample.create({
    data: {
      cxcl10,
      nox4,
      rbp4,
      ccdrOri,
      group: result.group,
      source: "USER",
      userId: session.user.id,
    },
  });

  return NextResponse.json({ id: sample.id, group: result.group, saved: true }, { status: 201 });
}
