import { PrismaClient, SampleSource } from "@prisma/client";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@example.com";
  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: "Admin",
      role: "ADMIN",
      status: "APPROVED",
      passwordHash: await bcrypt.hash("ChangeMe123!", 10),
    },
  });

  await prisma.sample.deleteMany({ where: { source: SampleSource.REFERENCE } });
  const csv = readFileSync(join(process.cwd(), "prisma/seed-data/reference.csv"), "utf8");
  const [, ...rows] = csv.trim().split(/\r?\n/);
  const data = rows.map((line) => {
    const [rbp4, cxcl10, nox4, ccdr, label] = line.split(",").map(Number);
    return {
      rbp4, cxcl10, nox4, ccdrOri: ccdr, label,
      source: SampleSource.REFERENCE,
    };
  });
  await prisma.sample.createMany({ data });

  console.log(`Seeded ${data.length} reference samples + admin user.`);
}

main().finally(() => prisma.$disconnect());
