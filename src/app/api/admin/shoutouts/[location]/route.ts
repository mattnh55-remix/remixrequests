import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateCurrentSession } from "@/lib/validators";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonFail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(
  _: Request,
  { params }: { params: { location: string } }
) {
  try {
    const loc = await prisma.location.findUnique({
      where: { slug: params.location },
      select: { id: true, slug: true, name: true },
    });

    if (!loc) return jsonFail("Unknown location.", 404);

    const session = await getOrCreateCurrentSession(loc.id, 4);

    const [pending, approved, active, rejected, blocked] = await Promise.all([
      prisma.screenMessage.findMany({
        where: {
          locationId: loc.id,
          sessionId: session.id,
          status: "PENDING",
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.screenMessage.findMany({
        where: {
          locationId: loc.id,
          sessionId: session.id,
          status: "APPROVED",
        },
        orderBy: { approvedAt: "desc" },
      }),
      prisma.screenMessage.findMany({
        where: {
          locationId: loc.id,
          sessionId: session.id,
          status: "ACTIVE",
        },
        orderBy: { approvedAt: "desc" },
      }),
      prisma.screenMessage.findMany({
        where: {
          locationId: loc.id,
          sessionId: session.id,
          status: "REJECTED",
        },
        orderBy: { rejectedAt: "desc" },
      }),
      prisma.screenMessage.count({
        where: {
          locationId: loc.id,
          sessionId: session.id,
          status: "BLOCKED_TEXT",
        },
      }),
    ]);

    return NextResponse.json({
      ok: true,
      location: { slug: loc.slug, name: loc.name },
      session: { id: session.id, endsAt: session.endsAt },
      pending,
      approved,
      active,
      rejected,
      blockedCount: blocked,
    });
  } catch (err: any) {
    console.error("[admin/shoutouts/list] error:", err?.message || err);
    return jsonFail("Internal error.", 500);
  }
}