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
  const locationSlug = String(body.location || "").trim();
  const songId = String(body.songId || "").trim();
  const action = String(body.action || "play_next").trim(); // play_next | play_now
  const email = String(body.email || "").trim();

  if (!locationSlug || !songId || !email) return jsonFail("Missing fields.", 400);
  if (action !== "play_next" && action !== "play_now") return jsonFail("Invalid action.", 400);

  const { loc, rules } = await getRulesForLocation(locationSlug);
  const session = await getOrCreateCurrentSession(loc.id, 4);
  const emailHash = hashEmail(email);

  const secs = await secondsSinceLastAction(loc.id, emailHash);
  if (secs < rules.minSecondsBetweenActions) {
    return jsonFail(`Please wait ${Math.ceil(rules.minSecondsBetweenActions - secs)}s.`, 400);
  }

  const song = await prisma.song.findFirst({
    where: { id: songId, locationId: loc.id },
    select: { id: true, locationId: true, explicit: true, artistKey: true, artist: true },
  });

  if (!song) return jsonFail("Song not found.", 404);
  if (song.explicit) return jsonFail(rules.msgExplicit, 400);

  const isPlayNow = action === "play_now";
  const cost = isPlayNow ? rules.costPlayNow : rules.costRequest;
  const alreadyQueuedMsg = rules.msgAlreadyRequested || "That song is already on the list already.";
  const artistQueueTemplate = rules.msgArtistAlreadyQueued || "Sorry, $artist is already queued up on the request list!";

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const now = new Date();

        // 1) block if this user has already hit the per-session request cap
        const existingCount = await tx.request.count({
          where: {
            locationId: loc.id,
            sessionId: session.id,
            emailHash,
          },
        });

        if (existingCount >= rules.maxRequestsPerSession) {
          throw new Error(`LIMIT:${rules.msgAlreadyRequested}`);
        }

        // 2) block duplicates already sitting in the current queue/session
        const alreadyQueued = await tx.request.findFirst({
          where: {
            locationId: loc.id,
            sessionId: session.id,
            songId: song.id,
            status: "APPROVED",
          },
          select: { id: true },
        });

        if (alreadyQueued) {
          throw new Error(`INQUEUE:${alreadyQueuedMsg}`);
        }

        // 2b) limit how many songs by the same artist can exist in the queue
        const maxArtistInQueue = Math.max(0, Number(rules.maxArtistInQueue ?? 0));
        if (maxArtistInQueue > 0) {
          const artistCount = await tx.request.count({
            where: {
              locationId: loc.id,
              sessionId: session.id,
              status: "APPROVED",
              song: {
                artistKey: song.artistKey,
              },
            },
          });

          if (artistCount >= maxArtistInQueue) {
            const artistName = String(song.artist || "This artist").trim() || "This artist";
            const artistQueueMsg = String(artistQueueTemplate).includes("$artist")
              ? String(artistQueueTemplate).replace(/\$artist/g, artistName)
              : `${artistName} is already queued up on the request list!`;
            throw new Error(`ARTISTQUEUE:${artistQueueMsg}`);
          }
        }

        // 3) block recently played artist based on rules
        if (rules.enforceArtistCooldown) {
          const artistSince = new Date(now.getTime() - rules.artistCooldownMinutes * 60 * 1000);
          const recentArtist = await tx.playHistory.findFirst({
            where: {
              locationId: loc.id,
              artistKey: song.artistKey,
              playedAt: { gte: artistSince },
            },
            select: { id: true },
          });

          if (recentArtist) {
            throw new Error(`ARTIST:${rules.msgArtistCooldown}`);
          }
        }

        // 4) block recently played song based on rules
        if (rules.enforceSongCooldown) {
          const songSince = new Date(now.getTime() - rules.songCooldownMinutes * 60 * 1000);
          const recentSong = await tx.playHistory.findFirst({
            where: {
              locationId: loc.id,
              songId: song.id,
              playedAt: { gte: songSince },
            },
            select: { id: true },
          });

          if (recentSong) {
            throw new Error(`SONG:${rules.msgSongCooldown}`);
          }
        }

        // 5) atomic balance check before any deduction
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

        // 6) deduct only after all validation passes
        await tx.creditLedger.create({
          data: {
            locationId: loc.id,
            emailHash,
            delta: -cost,
            reason: isPlayNow ? "PLAY_NOW" : "REQUEST",
          },
        });

        const reqRow = await tx.request.create({
          data: {
            locationId: loc.id,
            sessionId: session.id,
            songId: song.id,
            emailHash,
            type: isPlayNow ? "PLAY_NOW" : "NEXT",
            status: "APPROVED",
          },
        });

        return { reqRow, balanceAfter: balance - cost };
      },
      { isolationLevel: "Serializable" }
    );

    return NextResponse.json({
      ok: true,
      requestId: result.reqRow.id,
      balance: result.balanceAfter,
    });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg.startsWith("LIMIT:")) return jsonFail(msg.slice("LIMIT:".length), 400);
    if (msg.startsWith("INQUEUE:")) return jsonFail(msg.slice("INQUEUE:".length), 400);
    if (msg.startsWith("ARTISTQUEUE:")) return jsonFail(msg.slice("ARTISTQUEUE:".length), 400);
    if (msg.startsWith("ARTIST:")) return jsonFail(msg.slice("ARTIST:".length), 400);
    if (msg.startsWith("SONG:")) return jsonFail(msg.slice("SONG:".length), 400);
    if (msg.startsWith("NOCREDITS:")) return jsonFail(msg.slice("NOCREDITS:".length), 400);

    return jsonFail("Could not submit request. Please try again.", 400);
  }
}
