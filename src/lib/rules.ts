import { prisma } from "./db";

export async function getRulesForLocation(locationSlug: string) {
  const loc = await prisma.location.findUnique({ where: { slug: locationSlug } });
  if (!loc) throw new Error("Unknown location");
  let rules = await prisma.ruleset.findUnique({ where: { locationId: loc.id } });
  if (!rules) {
    rules = await prisma.ruleset.create({ data: { locationId: loc.id } });
  }
  return { loc, rules };
}
