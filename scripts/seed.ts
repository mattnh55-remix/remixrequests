import { prisma } from "../src/lib/db";

async function main() {
  const slug = "remixrequests";
  const name = "Remix Skate & Event Center";

  const loc = await prisma.location.upsert({
    where: { slug },
    update: { name },
    create: { slug, name }
  });

  await prisma.ruleset.upsert({
    where: { locationId: loc.id },
    update: {},
    create: { locationId: loc.id }
  });

  console.log("Seeded location:", loc.slug, loc.name);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
