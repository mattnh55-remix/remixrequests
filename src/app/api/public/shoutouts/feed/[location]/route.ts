
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateCurrentSession } from "@/lib/validators";
import { formatShoutoutProductLabel, getShoutoutAccent } from "@/lib/shoutoutProducts";
import { buildSmoothWeightedOrder, isMessageEligibleNow, pickCurrentScheduledMessage } from "@/lib/shoutoutScheduler";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { location: string } }) {
  try {
    const loc = await prisma.location.findUnique({ where: { slug: params.location }, select: { id: true } });
    if (!loc) return NextResponse.json({ current: null, items: [] });

    const session = await getOrCreateCurrentSession(loc.id, 4);
    const msgs = await prisma.screenMessage.findMany({
      where: {
        locationId: loc.id,
        sessionId: session.id,
        status: { in: ["APPROVED", "ACTIVE"] },
      },
      orderBy: [{ approvedAt: "asc" }, { createdAt: "asc" }],
      take: 50,
    });

    const nowMs = Date.now();
    const eligible = msgs.filter((m) => isMessageEligibleNow(m, nowMs));
    const current = pickCurrentScheduledMessage(eligible, nowMs, 10);
    const upcoming = buildSmoothWeightedOrder(eligible)
      .filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i)
      .slice(0, 6);

    const mapOut = (m: typeof msgs[number]) => ({
      id: m.id,
      title: "REMIX SHOUT OUTS!",
      fromName: m.fromName,
      body: m.messageText,
      messageText: m.messageText,
      productKey: m.tier,
      productTitle: formatShoutoutProductLabel(m.tier),
      displayDurationSec: m.displayDurationSec,
      imageUrl: null,
      accent: getShoutoutAccent(m.tier),
      approvedAt: m.approvedAt,
      createdAt: m.createdAt,
    });

    return NextResponse.json({
      current: current ? mapOut(current) : null,
      items: current ? [mapOut(current)] : [],
      upcoming: upcoming.map(mapOut),
      eligibleCount: eligible.length,
      generatedAt: new Date(nowMs).toISOString(),
      scheduler: { mode: "smooth_weighted_round_robin", slotSeconds: 10 },
    });
  } catch (err: any) {
    console.error("[public/shoutouts/feed] error:", err?.message || err);
    return NextResponse.json({ current: null, items: [] });
  }
}
