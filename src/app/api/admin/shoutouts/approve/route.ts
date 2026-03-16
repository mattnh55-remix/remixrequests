// src/app/api/admin/shoutouts/approve/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";

export const runtime = "nodejs";

function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request) {
  try {
    if (!isAdminFromCookie(req.headers.get("cookie") || "")) {
  return fail("Unauthorized", 401);
}

    const body = await req.json().catch(() => ({}));
    const messageId = String(body?.messageId || "").trim();
    if (!messageId) return fail("messageId is required");

    const msg = await prisma.screenMessage.findUnique({ where: { id: messageId } });
    if (!msg) return fail("Message not found", 404);

    if (msg.status === "APPROVED" || msg.status === "ACTIVE") {
      return NextResponse.json({ ok: true, messageId: msg.id, status: msg.status, alreadyDone: true });
    }

    if (msg.status !== "PENDING") {
      return fail(`Only pending shout-outs can be approved. Current status: ${msg.status}`);
    }

    const updated = await prisma.screenMessage.update({
      where: { id: msg.id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        rejectedAt: null,
        approvedBy: "admin",
      },
    });

    return NextResponse.json({ ok: true, messageId: updated.id, status: updated.status });
  } catch (err: any) {
    console.error("[admin/shoutouts/approve] error:", err?.message || err);
    return fail("Something went wrong", 500);
  }
}
