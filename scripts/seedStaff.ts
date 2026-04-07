import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.staffUser.upsert({
    where: { username: "MattNH55" },
    update: {
      pin: "5555",
      role: "SUPER_ADMIN",
      active: true,
    },
    create: {
      username: "MattNH55",
      pin: "5555",
      role: "SUPER_ADMIN",
      active: true,
    },
  });

  console.log("Staff user seeded");
}

main();