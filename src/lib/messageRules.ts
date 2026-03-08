// src/lib/messageRules.ts
import { prisma } from "@/lib/prisma";

export async function getMessageRules(locationSlug: string) {
  const loc = await prisma.location.findUnique({ where: { slug: locationSlug }});
  if (!loc) throw new Error("Location not found");

  let rules = await prisma.messageRuleset.findUnique({ where: { locationId: loc.id }});

  if (!rules) {
    rules = await prisma.messageRuleset.create({
      data: {
        locationId: loc.id,
        enabled: true,
        costBasic: 3,
        costFeatured: 6,
        maxMessageChars: 80,
        maxFromNameChars: 24,
        displayDurationBasicSec: 10,
        displayDurationFeaturedSec: 15,
        approvalRequired: true,
        autoRefundRejected: true,
        maxPendingPerIdentity: 3,
        filterBlockMessage: "This message can’t be submitted as written. Please revise and try again."
      }
    });
  }

  return { loc, rules };
}
