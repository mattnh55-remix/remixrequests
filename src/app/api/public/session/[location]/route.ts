// src/app/api/public/session/[location]/route.ts

import { NextResponse } from "next/server";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession } from "@/lib/validators";

export async function GET(_: Request, { params }: { params: { location: string } }) {
  const { loc, rules } = await getRulesForLocation(params.location);
  const session = await getOrCreateCurrentSession(loc.id, 4);
  return NextResponse.json({
    location: { slug: loc.slug, name: loc.name },
    session: { id: session.id, endsAt: session.endsAt },
    rules: {
      costRequest: rules.costRequest,
      logoUrl: rules.logoUrl,
      costUpvote: rules.costUpvote,
      costDownvote: rules.costDownvote,
      costPlayNow: rules.costPlayNow,
      enableVoting: rules.enableVoting
    }
  });
}
