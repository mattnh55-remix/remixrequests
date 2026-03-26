// src/app/api/public/session/[location]/route.ts

import { NextResponse } from "next/server";
import { getRulesForLocation } from "@/lib/rules";
import { getIdentitySpendableState } from "@/lib/validators";

export async function GET(req: Request, { params }: { params: { location: string } }) {
  const { loc, rules } = await getRulesForLocation(params.location);
  const { searchParams } = new URL(req.url);
  const identityId = String(searchParams.get("identityId") || "").trim();

  const guest = identityId ? await getIdentitySpendableState(loc.id, identityId) : null;

  return NextResponse.json({
    location: { slug: loc.slug, name: loc.name },
    session: {
      id: guest?.identity.id || null,
      startedAt: guest?.sessionStartedAt || null,
      endsAt: guest?.sessionExpiresAt || null,
      active: guest?.sessionActive || false,
      requiresVerification: !guest?.sessionActive,
    },
    balance: guest?.balance || 0,
    rules: {
      costRequest: rules.costRequest,
      logoUrl: rules.logoUrl,
      costUpvote: rules.costUpvote,
      costDownvote: rules.costDownvote,
      costPlayNow: rules.costPlayNow,
      enableVoting: rules.enableVoting,
    },
  });
}
