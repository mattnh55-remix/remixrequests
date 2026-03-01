import { NextResponse } from "next/server";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession } from "@/lib/validators";
import { getQueue } from "@/lib/queue";
import { isAdminFromCookie } from "@/lib/adminAuth";

export async function GET(req: Request, { params }: { params: { location: string } }) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { loc } = await getRulesForLocation(params.location);
  const session = await getOrCreateCurrentSession(loc.id, 4);
  const q = await getQueue(loc.id, session.id);

  return NextResponse.json({
    ok: true,
    sessionId: session.id,
    playNow: q.playNow.map(r => ({
      id: r.id, createdAt: r.createdAt, songId: r.songId, title: r.song.title, artist: r.song.artist, score: r.score, type: r.type
    })),
    upNext: q.main.map(r => ({
      id: r.id, createdAt: r.createdAt, songId: r.songId, title: r.song.title, artist: r.song.artist, score: r.score, type: r.type
    }))
  });
}
