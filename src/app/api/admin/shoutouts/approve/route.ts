// src/app/api/admin/shoutouts/approve/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { sendShoutoutApprovedSms } from "@/lib/shoutout-status-sms";

export const runtime = "nodejs";

function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request) {
  try {
    // 1. Auth Check
    if (!isAdminFromCookie(req.headers.get("cookie") || "")) {
      return fail("Unauthorized", 401);
    }

    // 2. Parse Body
    const body = await req.json().catch(() => ({}));
    const messageId = String(body?.messageId || "").trim();
    if (!messageId) return fail("messageId is required");

    // 3. Database Lookup
    const msg = await prisma.screenMessage.findUnique({ where: { id: messageId } });
    if (!msg) return fail("Message not found", 404);

    // 4. State Validation
    if (msg.status === "APPROVED" || msg.status === "ACTIVE") {
      return NextResponse.json({ ok: true, messageId: msg.id, status: msg.status, alreadyDone: true });
    }

    if (msg.status !== "PENDING") {
      return fail(`Only pending shout-outs can be approved. Current status: ${msg.status}`);
    }

    // 5. Update Record
    const updated = await prisma.screenMessage.update({
      where: { id: msg.id },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
        rejectedAt: null,
        approvedBy: "admin",
      },
    });

    // 6. Notify User
    const smsResult = await sendShoutoutApprovedSms({
      locationId: msg.locationId,
      emailHash: msg.emailHash,
    });

    return NextResponse.json({
      ok: true,
      messageId: updated.id,
      status: updated.status,
      texted: Boolean(smsResult?.ok),
      smsSkipped: Boolean((smsResult as any)?.skipped),
    });

  } catch (error: any) {
    console.error("Approval Error:", error);
    return fail(error.message || "Internal Server Error", 500);
  }
}