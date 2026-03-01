import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession, getCreditBalance, secondsSinceLastAction } from "@/lib/validators";
import { hashEmail } from "@/lib/security";

export async function POST(req: Request) {
  const body = await req.json();
  const locationSlug = String(body.location || "");
  const songId = String(body.songId || "");
  const action = String(body.action || "play_next"); // play_next | play_now
  const email = String(body.email || "");

  if (!locationSlug || !songId || !email) {
    return NextResponse.json({ ok: false, error: "Missing fields." }, { status: 400 });
  }

  const { loc, rules } = await getRulesForLocation(locationSlug);
  const session = await getOrCreateCurrentSession(loc.id, 4);
  const emailHash = hashEmail(email);

  const secs = await secondsSinceLastAction(loc.id, emailHash);
  if (secs < rules.minSecondsBetweenActions) {
    return NextResponse.json({ ok: false, error: `Please wait ${Math.ceil(rules.minSecondsBetweenActions - secs)}s.` }, { status: 400 });
  }

  const existingCount = await prisma.request.count({
    where: { locationId: loc.id, sessionId: session.id, emailHash }
  });
  if (existingCount >= rules.maxRequestsPerSession) {
    return NextResponse.json({ ok: false, error: rules.msgAlreadyRequested }, { status: 400 });
  }

  const song = await prisma.song.findFirst({ where: { id: songId, locationId: loc.id } });
  if (!song) return NextResponse.json({ ok: false, error: "Song not found." }, { status: 404 });
  if (song.explicit) return NextResponse.json({ ok: false, error: rules.msgExplicit }, { status: 400 });

  const balance = await getCreditBalance(loc.id, emailHash);

  const isPlayNow = action === "play_now";
  const cost = isPlayNow ? rules.costPlayNow : rules.costRequest;

  if (balance < cost) return NextResponse.json({ ok: false, error: rules.msgNoCredits }, { status: 400 });

  if (isPlayNow) {
    const now = new Date();
    if (rules.enforceArtistCooldown) {
      const since = new Date(now.getTime() - rules.artistCooldownMinutes * 60 * 1000);
      const recentArtist = await prisma.playHistory.findFirst({
        where: { locationId: loc.id, artistKey: song.artistKey, playedAt: { gte: since } }
      });
      if (recentArtist) return NextResponse.json({ ok: false, error: rules.msgArtistCooldown }, { status: 400 });
    }
    if (rules.enforceSongCooldown) {
      const since = new Date(now.getTime() - rules.songCooldownMinutes * 60 * 1000);
      const recentSong = await prisma.playHistory.findFirst({
        where: { locationId: loc.id, songId: song.id, playedAt: { gte: since } }
      });
      if (recentSong) return NextResponse.json({ ok: false, error: rules.msgSongCooldown }, { status: 400 });
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    await tx.creditLedger.create({ data: { locationId: loc.id, emailHash, delta: -cost, reason: isPlayNow ? "PLAY_NOW" : "REQUEST" } });
    const reqRow = await tx.request.create({
      data: {
        locationId: loc.id,
        sessionId: session.id,
        songId: song.id,
        emailHash,
        type: isPlayNow ? "PLAY_NOW" : "NEXT",
        status: "APPROVED"
      }
    });
    return reqRow;
  });

  return NextResponse.json({ ok: true, requestId: result.id });
}
