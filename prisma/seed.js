import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const users = [
    { username: "admin", password: "Hodder123!", role: "ADMIN" },
    { username: "aj", password: "romeo10", role: "EMPLOYEE" },
  ];

  for (const u of users) {
    const hashed = await bcrypt.hash(u.password, 10);

    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: {
        username: u.username,
        password: hashed,
        role: u.role,
      },
    });
  }

  console.log("✅ Seeded admin + aj");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
