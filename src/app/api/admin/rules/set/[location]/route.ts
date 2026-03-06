// src/app/api/admin/rules/set/[location]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRulesForLocation } from "@/lib/rules";
import { isAdminFromCookie } from "@/lib/adminAuth";

function int(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

export async function POST(req: Request, { params }: { params: { location: string } }) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { loc, rules } = await getRulesForLocation(params.location);
  const body = await req.json();

  const updated = await prisma.ruleset.update({
    where: { locationId: loc.id },
    data: {
      costRequest: int(body.costRequest, rules.costRequest),
      costUpvote: int(body.costUpvote, rules.costUpvote),
      costDownvote: int(body.costDownvote, rules.costDownvote),
      costPlayNow: int(body.costPlayNow, rules.costPlayNow),

      // NEW: pack prices (cents)
packTier1PriceCents: int(body.packTier1PriceCents, rules.packTier1PriceCents),
packTier2PriceCents: int(body.packTier2PriceCents, rules.packTier2PriceCents),
packTier3PriceCents: int(body.packTier3PriceCents, rules.packTier3PriceCents),
packTier4PriceCents: int(body.packTier4PriceCents, rules.packTier4PriceCents),

      logoUrl: body.logoUrl ?? null,

      maxRequestsPerSession: int(body.maxRequestsPerSession, rules.maxRequestsPerSession),
      maxVotesPerSession: int(body.maxVotesPerSession, rules.maxVotesPerSession),
      minSecondsBetweenActions: int(body.minSecondsBetweenActions, rules.minSecondsBetweenActions),

      enforceArtistCooldown: Boolean(body.enforceArtistCooldown),
      enforceSongCooldown: Boolean(body.enforceSongCooldown),
      artistCooldownMinutes: int(body.artistCooldownMinutes, rules.artistCooldownMinutes),
      songCooldownMinutes: int(body.songCooldownMinutes, rules.songCooldownMinutes),

      enableVoting: Boolean(body.enableVoting),

      msgExplicit: String(body.msgExplicit ?? rules.msgExplicit),
      msgAlreadyRequested: String(body.msgAlreadyRequested ?? rules.msgAlreadyRequested),
      msgArtistCooldown: String(body.msgArtistCooldown ?? rules.msgArtistCooldown),
      msgSongCooldown: String(body.msgSongCooldown ?? rules.msgSongCooldown),
      msgNoCredits: String(body.msgNoCredits ?? rules.msgNoCredits),
    },
  });

  return NextResponse.json({ ok: true, rules: updated });
}