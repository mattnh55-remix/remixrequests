import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.staffUser.upsert({
    where: { username: "MattP" },
    update: {
      pin: "5555",
      role: "SUPER_ADMIN",
      active: true,
    },
    create: {
      username: "MattP",
      pin: "5555",
      role: "SUPER_ADMIN",
      active: true,
    },
  });

  console.log("Staff user seeded");
}

main();