// src/app/api/public/shoutouts/feed/[location]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateCurrentSession } from "@/lib/validators";
import { formatShoutoutProductLabel, getShoutoutAccent } from "@/lib/shoutoutProducts";
import {
  buildSmoothWeightedOrder,
  isMessageEligibleNow,
  pickCurrentScheduledMessage,
} from "@/lib/shoutoutScheduler";
import { createSignedStorageUrl } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: { location: string } }) {
  try {
    const loc = await prisma.location.findUnique({
      where: { slug: params.location },
      select: { id: true },
    });
    if (!loc) return NextResponse.json({ current: null, items: [], upcoming: [] });

    const session = await getOrCreateCurrentSession(loc.id, 4);
    const msgs = await prisma.screenMessage.findMany({
      where: {
        locationId: loc.id,
        sessionId: session.id,
        status: { in: ["APPROVED", "ACTIVE"] },
        rejectedAt: null,
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

    async function mapOut(m: (typeof msgs)[number]) {
       let imageUrl: string | null = null;

      if (m.imagePreviewPath) {
        try {
          imageUrl = await createSignedStorageUrl(m.imagePreviewPath, 60 * 30);
        } catch {
          imageUrl = null;
        }
      }

      if (!imageUrl && m.imageOriginalPath) {
        try {
          imageUrl = await createSignedStorageUrl(m.imageOriginalPath, 60 * 30);
        } catch {
          imageUrl = null;
        }
      }
      return {
        id: m.id,
        title: "REMIX SHOUT OUTS!",
        fromName: m.fromName,
        body: m.messageText,
        messageText: m.messageText,
        productKey: m.tier,
        productTitle: formatShoutoutProductLabel(m.tier),
        displayDurationSec: m.displayDurationSec,
        imageUrl,
        accent: getShoutoutAccent(m.tier),
        approvedAt: m.approvedAt,
        createdAt: m.createdAt,
      };
    }

    const mappedCurrent = current ? await mapOut(current) : null;
    const mappedUpcoming = await Promise.all(upcoming.map(mapOut));

    return NextResponse.json({
      current: mappedCurrent,
      items: mappedCurrent ? [mappedCurrent] : [],
      upcoming: mappedUpcoming,
      eligibleCount: eligible.length,
      generatedAt: new Date(nowMs).toISOString(),
      scheduler: { mode: "smooth_weighted_round_robin", slotSeconds: 10 },
    });
  } catch (err: any) {
    console.error("[public/shoutouts/feed] error:", err?.message || err);
    return NextResponse.json({ current: null, items: [], upcoming: [] });
  }
}