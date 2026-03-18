// src/app/api/admin/rules/set/[location]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRulesForLocation } from "@/lib/rules";
import { isAdminFromCookie } from "@/lib/adminAuth";

function int(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.floor(n) : fallback;
}

function bool(v: any, fallback: boolean) {
  return typeof v === "boolean" ? v : fallback;
}

function str(v: any, fallback: string) {
  return typeof v === "string" ? v : fallback;
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

      packTier1PriceCents: int(body.packTier1PriceCents, rules.packTier1PriceCents),
      packTier2PriceCents: int(body.packTier2PriceCents, rules.packTier2PriceCents),
      packTier3PriceCents: int(body.packTier3PriceCents, rules.packTier3PriceCents),
      packTier4PriceCents: int(body.packTier4PriceCents, rules.packTier4PriceCents),

      logoUrl: body.logoUrl ?? rules.logoUrl ?? null,

      maxRequestsPerSession: int(body.maxRequestsPerSession, rules.maxRequestsPerSession),
      maxVotesPerSession: int(body.maxVotesPerSession, rules.maxVotesPerSession),
      minSecondsBetweenActions: int(body.minSecondsBetweenActions, rules.minSecondsBetweenActions),
      maxArtistInQueue: int(body.maxArtistInQueue, rules.maxArtistInQueue),
      maxActiveRequestsPerUser: int(body.maxActiveRequestsPerUser, rules.maxActiveRequestsPerUser),

      enforceArtistCooldown: bool(body.enforceArtistCooldown, rules.enforceArtistCooldown),
      enforceSongCooldown: bool(body.enforceSongCooldown, rules.enforceSongCooldown),
      artistCooldownMinutes: int(body.artistCooldownMinutes, rules.artistCooldownMinutes),
      songCooldownMinutes: int(body.songCooldownMinutes, rules.songCooldownMinutes),

      enableVoting: bool(body.enableVoting, rules.enableVoting),

      msgExplicit: str(body.msgExplicit, rules.msgExplicit),
      msgTooManyActiveRequests: str(body.msgTooManyActiveRequests, rules.msgTooManyActiveRequests),
      msgAlreadyRequested: str(body.msgAlreadyRequested, rules.msgAlreadyRequested),
      msgArtistCooldown: str(body.msgArtistCooldown, rules.msgArtistCooldown),
      msgSongCooldown: str(body.msgSongCooldown, rules.msgSongCooldown),
      msgArtistAlreadyQueued: str(body.msgArtistAlreadyQueued, rules.msgArtistAlreadyQueued),
      msgNoCredits: str(body.msgNoCredits, rules.msgNoCredits),

      top10Enabled: bool(body.top10Enabled, rules.top10Enabled),
      top10Timezone: str(body.top10Timezone, rules.top10Timezone),
      top10AdultCutoffHour: int(body.top10AdultCutoffHour, rules.top10AdultCutoffHour),
      top10AdultCutoffMinute: int(body.top10AdultCutoffMinute, rules.top10AdultCutoffMinute),
    },
  });

  return NextResponse.json({ ok: true, rules: updated });
}
