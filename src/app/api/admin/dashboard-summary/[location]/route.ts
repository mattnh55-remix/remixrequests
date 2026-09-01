import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminFromCookie } from "@/lib/adminAuth";

function ranges(period: "week" | "month") {
  const now = new Date();
  const start = new Date(now);
  if (period === "week") {
    const mondayOffset = (now.getDay() + 6) % 7;
    start.setDate(now.getDate() - mondayOffset);
  } else start.setDate(1);
  start.setHours(0, 0, 0, 0);
  const previousStart = new Date(start);
  const previousEnd = new Date(now);
  if (period === "week") {
    previousStart.setDate(previousStart.getDate() - 7);
    previousEnd.setDate(previousEnd.getDate() - 7);
  } else {
    previousStart.setMonth(previousStart.getMonth() - 1);
    previousEnd.setMonth(previousEnd.getMonth() - 1);
  }
  return { now, start, previousStart, previousEnd };
}

function sumDelta(rows: Array<{ delta: number }>) { return rows.reduce((total, row) => total + row.delta, 0); }

export async function GET(req: Request, { params }: { params: { location: string } }) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const period = new URL(req.url).searchParams.get("period") === "month" ? "month" : "week";
  const { start, previousStart, previousEnd, now } = ranges(period);
  const location = await prisma.location.findUnique({ where: { slug: params.location }, select: { id: true } });
  if (!location) return NextResponse.json({ ok: false, error: "Location not found" }, { status: 404 });
  const ledgerWhere = { locationId: location.id, createdAt: { gte: previousStart, lt: now } };
  const [ledger, requests, periodRequests, songs] = await Promise.all([
    prisma.creditLedger.findMany({ where: ledgerWhere, select: { delta: true, reason: true, createdAt: true } }),
    prisma.request.findMany({ where: { locationId: location.id }, include: { song: { select: { id: true, title: true, artist: true, artworkUrl: true, albumArtFile: true } } }, orderBy: { createdAt: "desc" }, take: 10 }),
    prisma.request.findMany({ where: { locationId: location.id, createdAt: { gte: start } }, include: { song: { select: { id: true, title: true, artist: true } } }, orderBy: { createdAt: "desc" } }),
    prisma.song.findMany({ where: { locationId: location.id, importBatch: { not: null }, createdAt: { gte: start } }, select: { importBatch: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const currentLedger = ledger.filter((row) => row.createdAt >= start);
  const priorLedger = ledger.filter((row) => row.createdAt >= previousStart && row.createdAt < previousEnd);
  const purchased = (rows: typeof ledger) => rows.filter((row) => /purchase|payment|checkout|pack/i.test(row.reason));
  const issued = (rows: typeof ledger) => sumDelta(rows.filter((row) => row.delta > 0));
  const requestCounts = new Map<string, { title: string; artist: string; count: number }>();
  for (const request of periodRequests) { const current = requestCounts.get(request.songId) || { title: request.song.title, artist: request.song.artist, count: 0 }; current.count += 1; requestCounts.set(request.songId, current); }
  const topSong = [...requestCounts.values()].sort((a, b) => b.count - a.count)[0] || null;
  const importBatches = [...new Map(songs.map((song) => [song.importBatch, song.createdAt])).entries()].map(([batch, createdAt]) => ({ batch, createdAt }));
  const writeIns = await prisma.songWriteIn.findMany({ where: { locationId: location.id, status: { in: ["PENDING", "MATCHED"] } }, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, requestedTitle: true, requestedArtist: true, createdAt: true } });
  return NextResponse.json({ ok: true, period, pointsIssued: { current: issued(currentLedger), previous: issued(priorLedger) }, pointsPurchased: { current: sumDelta(purchased(currentLedger)), previous: sumDelta(purchased(priorLedger)) }, latestRequests: requests.map((request) => ({ id: request.id, title: request.song.title, artist: request.song.artist, artworkUrl: request.song.artworkUrl || request.song.albumArtFile || null, createdAt: request.createdAt, type: request.type })), latestWriteIns: writeIns.map((item) => ({ id:item.id, title:item.requestedTitle, artist:item.requestedArtist, createdAt:item.createdAt })), topSong: topSong?.count && topSong.count >= 2 ? topSong : null, spotifyImports: importBatches });
}
