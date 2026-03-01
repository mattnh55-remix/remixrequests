import { NextResponse } from "next/server";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession } from "@/lib/validators";
import { getQueue } from "@/lib/queue";

export async function GET(_: Request, { params }: { params: { location: string } }) {
  const { loc } = await getRulesForLocation(params.location);
  const session = await getOrCreateCurrentSession(loc.id, 4);
  const q = await getQueue(loc.id, session.id);

  return NextResponse.json({
    sessionId: session.id,
    playNow: q.playNow.map(r => ({
      id: r.id, title: r.song.title, artist: r.song.artist, artworkUrl: r.song.artworkUrl, score: r.score
    })),
    upNext: q.main.map(r => ({
      id: r.id, title: r.song.title, artist: r.song.artist, artworkUrl: r.song.artworkUrl, score: r.score
    }))
  });
}
