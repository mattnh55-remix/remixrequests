import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateCurrentSession } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _: Request,
  { params }: { params: { location: string } }
) {
  try {
    const loc = await prisma.location.findUnique({
      where: { slug: params.location },
      select: { id: true },
    });

    if (!loc) {
      return NextResponse.json({ items: [] });
    }

    const session = await getOrCreateCurrentSession(loc.id, 4);

    const msgs = await prisma.screenMessage.findMany({
      where: {
        locationId: loc.id,
        sessionId: session.id,
        status: { in: ["APPROVED", "ACTIVE"] },
      },
      orderBy: [
        { tier: "desc" },
        { approvedAt: "asc" },
        { createdAt: "asc" },
      ],
      take: 20,
    });

    return NextResponse.json({
      items: msgs.map((m) => ({
        id: m.id,
        fromName: m.fromName,
        body: m.messageText,
        messageText: m.messageText,
        tier: m.tier,
        displayDurationSec: m.displayDurationSec,
        imageUrl: null,
        accent: m.tier === "FEATURED" ? "pink" : "cyan",
      })),
    });
  } catch (err: any) {
    console.error("[public/shoutouts/feed] error:", err?.message || err);
    return NextResponse.json({ items: [] });
  }
}