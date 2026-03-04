// src/app/api/public/request/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession, secondsSinceLastAction } from "@/lib/validators";
import { hashEmail } from "@/lib/security";

function jsonFail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request) {
  const body = await req.json();
  const locationSlug = String(body.location || "");
  const songId = String(body.songId || "");
  const action = String(body.action || "play_next"); // play_next | play_now
  const email = String(body.email || "");

  if (!locationSlug || !songId || !email) return jsonFail("Missing fields.", 400);

  const { loc, rules } = await getRulesForLocation(locationSlug);
  const session = await getOrCreateCurrentSession(loc.id, 4);
  const emailHash = hashEmail(email);

  const secs = await secondsSinceLastAction(loc.id, emailHash);
  if (secs < rules.minSecondsBetweenActions) {
    return jsonFail(`Please wait ${Math.ceil(rules.minSecondsBetweenActions - secs)}s.`, 400);
  }

  const song = await prisma.song.findFirst({ where: { id: songId, locationId: loc.id } });
  if (!song) return jsonFail("Song not found.", 404);
  if (song.explicit) return jsonFail(rules.msgExplicit, 400);

  const isPlayNow = action === "play_now";
  const cost = isPlayNow ? rules.costPlayNow : rules.costRequest;

  // cooldown checks (safe outside txn)
  if (isPlayNow) {
    const now = new Date();

    if (rules.enforceArtistCooldown) {
      const since = new Date(now.getTime() - rules.artistCooldownMinutes * 60 * 1000);
      const recentArtist = await prisma.playHistory.findFirst({
        where: { locationId: loc.id, artistKey: song.artistKey, playedAt: { gte: since } },
      });
      if (recentArtist) return jsonFail(rules.msgArtistCooldown, 400);
    }

    if (rules.enforceSongCooldown) {
      const since = new Date(now.getTime() - rules.songCooldownMinutes * 60 * 1000);
      const recentSong = await prisma.playHistory.findFirst({
        where: { locationId: loc.id, songId: song.id, playedAt: { gte: since } },
      });
      if (recentSong) return jsonFail(rules.msgSongCooldown, 400);
    }
  }

  try {
    const reqRow = await prisma.$transaction(
      async (tx) => {
        // enforce per-session request limit INSIDE txn (prevents concurrency bypass)
        const existingCount = await tx.request.count({
          where: { locationId: loc.id, sessionId: session.id, emailHash },
        });
        if (existingCount >= rules.maxRequestsPerSession) {
          throw new Error(`LIMIT:${rules.msgAlreadyRequested}`);
        }

        // atomic balance check INSIDE txn (prevents double-spend)
        const now = new Date();
        const agg = await tx.creditLedger.aggregate({
          _sum: { delta: true },
          where: {
            locationId: loc.id,
            emailHash,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        });
        const balance = agg._sum.delta ?? 0;
        if (balance < cost) {
          throw new Error(`NOCREDITS:${rules.msgNoCredits}`);
        }

        await tx.creditLedger.create({
          data: {
            locationId: loc.id,
            emailHash,
            delta: -cost,
            reason: isPlayNow ? "PLAY_NOW" : "REQUEST",
          },
        });

        return await tx.request.create({
          data: {
            locationId: loc.id,
            sessionId: session.id,
            songId: song.id,
            emailHash,
            type: isPlayNow ? "PLAY_NOW" : "NEXT",
            status: "APPROVED",
          },
        });
      },
      { isolationLevel: "Serializable" }
    );

    return NextResponse.json({ ok: true, requestId: reqRow.id });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg.startsWith("LIMIT:")) return jsonFail(msg.slice("LIMIT:".length), 400);
    if (msg.startsWith("NOCREDITS:")) return jsonFail(msg.slice("NOCREDITS:".length), 400);

    // Serializable retries can surface as generic errors; don't leak internals
    return jsonFail("Could not submit request. Please try again.", 400);
  }
}