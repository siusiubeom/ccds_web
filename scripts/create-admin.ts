import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const EMAIL    = "siubeom2005915@gmail.com";
const PASSWORD = "ls104480";

async function main() {
  const hash = await bcrypt.hash(PASSWORD, 10);
  const user = await prisma.user.upsert({
    where:  { email: EMAIL },
    update: { role: "ADMIN", status: "APPROVED", passwordHash: hash },
    create: { email: EMAIL, name: "Admin", role: "ADMIN", status: "APPROVED", passwordHash: hash },
  });
  console.log(`Done — ${user.email} (${user.role}, ${user.status})`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
