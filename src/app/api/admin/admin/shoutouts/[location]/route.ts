// src/app/api/admin/shoutouts/[location]/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getOrCreateCurrentSession } from "@/lib/validators";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { createSignedStorageUrl } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

async function attachSignedImageUrl<T extends {
  imagePreviewPath?: string | null;
  imageOriginalPath?: string | null;
}>(items: T[]) {
  return Promise.all(
    items.map(async (item) => {
      let signedImageUrl: string | null = null;

      if (item.imagePreviewPath) {
        try {
          signedImageUrl = await createSignedStorageUrl(item.imagePreviewPath, 60 * 30);
        } catch {
          signedImageUrl = null;
        }
      }

      if (!signedImageUrl && item.imageOriginalPath) {
        try {
          signedImageUrl = await createSignedStorageUrl(item.imageOriginalPath, 60 * 30);
        } catch {
          signedImageUrl = null;
        }
      }

      return {
        ...item,
        signedImageUrl,
      };
    })
  );
}

export async function GET(req: Request, { params }: { params: { location: string } }) {
  try {
    if (!isAdminFromCookie(req.headers.get("cookie") || "")) {
      return fail("Unauthorized", 401);
    }

    const loc = await prisma.location.findUnique({
      where: { slug: params.location },
      select: { id: true },
    });
    if (!loc) return fail("Location not found", 404);

    const session = await getOrCreateCurrentSession(loc.id, 4);

    const [pendingRaw, approvedRaw, activeRaw, rejectedRaw, blockedCount] = await Promise.all([
      prisma.screenMessage.findMany({
        where: { locationId: loc.id, sessionId: session.id, status: "PENDING" },
        orderBy: [{ createdAt: "asc" }],
      }),
      prisma.screenMessage.findMany({
        where: { locationId: loc.id, sessionId: session.id, status: "APPROVED" },
        orderBy: [{ approvedAt: "desc" }, { createdAt: "desc" }],
        take: 25,
      }),
      prisma.screenMessage.findMany({
        where: { locationId: loc.id, sessionId: session.id, status: "ACTIVE" },
        orderBy: [{ activatedAt: "desc" }, { approvedAt: "desc" }, { createdAt: "desc" }],
        take: 25,
      }),
      prisma.screenMessage.findMany({
        where: { locationId: loc.id, sessionId: session.id, status: "REJECTED" },
        orderBy: [{ rejectedAt: "desc" }, { createdAt: "desc" }],
        take: 25,
      }),
      prisma.screenMessage.count({
        where: {
          locationId: loc.id,
          sessionId: session.id,
          status: { in: ["BLOCKED_TEXT", "BLOCKED_IMAGE"] },
        },
      }),
    ]);

    const [pending, approved, active, rejected] = await Promise.all([
      attachSignedImageUrl(pendingRaw),
      attachSignedImageUrl(approvedRaw),
      attachSignedImageUrl(activeRaw),
      attachSignedImageUrl(rejectedRaw),
    ]);

    return NextResponse.json({
      ok: true,
      pending,
      approved,
      active,
      rejected,
      blockedCount,
    });
  } catch (err: any) {
    console.error("[admin/shoutouts/list] error:", err?.message || err);
    return fail("Something went wrong", 500);
  }
}