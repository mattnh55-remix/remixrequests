import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRulesForLocation } from "@/lib/rules";
import {
  getCreditBalance,
  getEmailHashSpendableState,
  getOrCreateCurrentSession,
  secondsSinceLastAction,
} from "@/lib/validators";
import { hashEmail } from "@/lib/security";
import { bumpTop10Request, getTop10BucketAt } from "@/lib/top10";

function jsonFail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function buildArtistQueueMessage(template: string, artist: string) {
  const safeArtist = String(artist || "This artist").trim() || "This artist";
  return String(template).includes("$artist")
    ? String(template).replace(/\$artist/g, safeArtist)
    : `${safeArtist} is already queued up on the request list!`;
}

const ACTIVE_REQUEST_STATUSES = ["PENDING", "ACCEPTED", "APPROVED"] as const;
const CUSTOMER_PENDING_STATUS = "PENDING" as const;
const ADMIN_EMAIL_HASH = "__booth_admin__";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const locationSlug = String(body.location || "").trim();
    const songId = String(body.songId || "").trim();
    const action = String(body.action || "play_next").trim();
    const email = String(body.email || "").trim();

    if (!locationSlug || !songId || !email) return jsonFail("Missing fields.", 400);
    if (action !== "play_next" && action !== "play_now") return jsonFail("Invalid action.", 400);

    const { loc, rules } = await getRulesForLocation(locationSlug);
    const session = await getOrCreateCurrentSession(loc.id, 4);
    const emailHash = hashEmail(email);

    const guestState = await getEmailHashSpendableState(loc.id, emailHash);
    if (!guestState?.identity?.smsVerifiedAt) {
      return jsonFail("Please verify your phone to continue.", 403);
    }
    if (!guestState.sessionActive || !guestState.sessionExpiresAt) {
      return jsonFail("Your 4-hour session has expired. Verify again to continue.", 403);
    }

    const sessionExpiresAt = guestState.sessionExpiresAt;
    const now = new Date();

    const secs = await secondsSinceLastAction(loc.id, emailHash);
    if (secs < rules.minSecondsBetweenActions) {
      return jsonFail(`Please wait ${Math.ceil(rules.minSecondsBetweenActions - secs)}s.`, 400);
    }

    const song = await prisma.song.findFirst({
      where: { id: songId, locationId: loc.id },
      select: {
        id: true,
        title: true,
        artist: true,
        artworkUrl: true,
        locationId: true,
        explicit: true,
        artistKey: true,
      },
    });

    if (!song) return jsonFail("Song not found.", 404);
    if (song.explicit) return jsonFail(rules.msgExplicit, 400);

    const isPlayNow = action === "play_now";
    const cost = isPlayNow ? rules.costPlayNow : rules.costRequest;
    const alreadyQueuedMsg = rules.msgAlreadyRequested || "That song is already on the list already.";
    const artistQueueTemplate =
      rules.msgArtistAlreadyQueued || "Sorry, $artist is already queued up on the request list!";
    const queueFullMessage =
      (rules as any).msgQueueFull || "The request line is full right now. Please check back in a bit.";
    const top10Bucket = getTop10BucketAt(now, rules as any);

    const maxOnDeck = Math.max(0, Number((rules as any).maxOnDeck ?? 0));
    if (maxOnDeck > 0) {
      const incomingPendingCount = await prisma.request.count({
        where: {
          locationId: loc.id,
          sessionId: session.id,
          status: CUSTOMER_PENDING_STATUS,
          emailHash: { not: ADMIN_EMAIL_HASH },
        },
      });

      if (incomingPendingCount >= maxOnDeck) {
        return jsonFail(queueFullMessage, 400);
      }
    }

const maxRequestsPerSession = Math.max(0, Number(rules.maxRequestsPerSession ?? 0));
if (maxRequestsPerSession > 0) {
  const totalRequestsThisSession = await prisma.request.count({
    where: {
      locationId: loc.id,
      sessionId: session.id,
      emailHash,
    },
  });

  if (totalRequestsThisSession >= maxRequestsPerSession) {
    return jsonFail(
      (rules as any).msgTooManyRequestsPerSession || "You’ve reached your request limit for this session.",
      400
    );
  }
}

    const activeQueueLimit = Math.max(0, Number((rules as any).maxActiveRequestsPerUser ?? 0));
    if (activeQueueLimit > 0) {
      const activeCount = await prisma.request.count({
        where: {
          locationId: loc.id,
          sessionId: session.id,
          emailHash,
          status: { in: [...ACTIVE_REQUEST_STATUSES] },
        },
      });

      if (activeCount >= activeQueueLimit) {
        return jsonFail(
          (rules as any).msgTooManyActiveRequests || "You already have songs waiting in the queue.",
          400
        );
      }
    }

    const alreadyQueued = await prisma.request.findFirst({
      where: {
        locationId: loc.id,
        sessionId: session.id,
        songId: song.id,
        status: { in: [...ACTIVE_REQUEST_STATUSES] },
      },
      select: { id: true },
    });

    if (alreadyQueued) {
      return jsonFail(alreadyQueuedMsg, 400);
    }

    const maxArtistInQueue = Math.max(0, Number(rules.maxArtistInQueue ?? 0));
    if (maxArtistInQueue > 0) {
      const artistCount = await prisma.request.count({
        where: {
          locationId: loc.id,
          sessionId: session.id,
          status: { in: [...ACTIVE_REQUEST_STATUSES] },
          song: { artistKey: song.artistKey },
        },
      });

      if (artistCount >= maxArtistInQueue) {
        return jsonFail(buildArtistQueueMessage(artistQueueTemplate, song.artist), 400);
      }
    }

    if (rules.enforceArtistCooldown) {
      const artistSince = new Date(now.getTime() - rules.artistCooldownMinutes * 60 * 1000);
      const recentArtist = await prisma.playHistory.findFirst({
        where: {
          locationId: loc.id,
          artistKey: song.artistKey,
          playedAt: { gte: artistSince },
        },
        select: { id: true },
      });

      if (recentArtist) {
        return jsonFail(rules.msgArtistCooldown, 400);
      }
    }

    if (rules.enforceSongCooldown) {
      const songSince = new Date(now.getTime() - rules.songCooldownMinutes * 60 * 1000);
      const recentSong = await prisma.playHistory.findFirst({
        where: {
          locationId: loc.id,
          songId: song.id,
          playedAt: { gte: songSince },
        },
        select: { id: true },
      });

      if (recentSong) {
        return jsonFail(rules.msgSongCooldown, 400);
      }
    }

    const balance = await getCreditBalance(loc.id, emailHash, now);
    if (balance < cost) {
      return jsonFail(rules.msgNoCredits, 400);
    }

    const core = await prisma.$transaction(
      async (tx) => {
        await tx.creditLedger.create({
          data: {
            locationId: loc.id,
            emailHash,
            delta: -cost,
            reason: isPlayNow ? "PLAY_NOW" : "REQUEST",
            expiresAt: sessionExpiresAt,
          },
        });

        const reqRow = await tx.request.create({
          data: {
            locationId: loc.id,
            sessionId: session.id,
            songId: song.id,
            emailHash,
            type: isPlayNow ? "PLAY_NOW" : "NEXT",
            status: "PENDING",
            top10Bucket,
          },
        });

        return {
          reqRow,
          balanceAfter: Math.max(balance - cost, 0),
        };
      },
      {
        isolationLevel: "Serializable",
        timeout: 15000,
        maxWait: 10000,
      }
    );

    await prisma.$transaction(async (tx) => {
      await bumpTop10Request(tx, {
        locationId: loc.id,
        bucket: top10Bucket,
        song,
      });
    });

    return NextResponse.json({
      ok: true,
      requestId: core.reqRow.id,
      queueItemId: null,
      pending: true,
      balance: core.balanceAfter,
      top10Bucket,
      sessionExpiresAt,
    });
  } catch (e: any) {
    console.error("PUBLIC_REQUEST_ROUTE_ERROR", e);
    return jsonFail("Could not submit request. Please try again.", 400);
  }
}
