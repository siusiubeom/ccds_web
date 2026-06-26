import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { classify } from "@/lib/risk";
import type { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded." }, { status: 400 });

  const text = await file.text();
  const [header, ...rows] = text.trim().split(/\r?\n/).filter(Boolean);
  if (!header) return NextResponse.json({ error: "Empty file." }, { status: 400 });

  const cols = header.split(",").map(s => s.trim().toLowerCase());
  const idx = (name: string) => cols.indexOf(name);

  const ci = idx("cxcl10"), ni = idx("nox4");
  if (ci === -1 || ni === -1) {
    return NextResponse.json({ error: "CSV must have cxcl10 and nox4 columns." }, { status: 400 });
  }
  const ri = idx("rbp4"), di = idx("ccdr_ori"), li = idx("label");

  const toInsert: Prisma.SampleCreateManyInput[] = [];
  const skipped: string[] = [];

  for (const row of rows) {
    const v = row.split(",").map(s => s.trim());
    const cxcl10 = parseFloat(v[ci]);
    const nox4   = parseFloat(v[ni]);
    if (isNaN(cxcl10) || isNaN(nox4)) { skipped.push(row); continue; }

    const result = classify(cxcl10, nox4);
    if (!result) { skipped.push(row); continue; }

    toInsert.push({
      cxcl10, nox4,
      rbp4:    ri !== -1 && v[ri] ? parseFloat(v[ri])   : undefined,
      ccdrOri: di !== -1 && v[di] ? parseInt(v[di], 10) : undefined,
      label:   li !== -1 && v[li] ? parseInt(v[li], 10) : undefined,
      group:   result.group,
      source:  "IMPORT",
    });
  }

  if (toInsert.length > 0) {
    await prisma.sample.createMany({ data: toInsert });
  }

  return NextResponse.json({ imported: toInsert.length, skipped: skipped.length });
}
