// src/app/api/admin/shoutouts/edit/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { moderateShoutoutText } from "@/lib/shoutoutModeration";

export const runtime = "nodejs";

function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function hasTooLongRun(input: string, maxRun = 20) {
  let run = 0;

  for (const ch of String(input || "")) {
    if (/\s/.test(ch)) {
      run = 0;
      continue;
    }

    run += 1;
    if (run > maxRun) return true;
  }

  return false;
}

export async function POST(req: Request) {
  try {
    if (!isAdminFromCookie(req.headers.get("cookie") || "")) {
      return fail("Unauthorized", 401);
    }

    const body = await req.json().catch(() => ({}));
    const messageId = String(body?.messageId || "").trim();
    const fromName = String(body?.fromName || "").trim();
    const messageText = String(body?.messageText || "").trim();

    if (!messageId) return fail("messageId is required");
    if (!fromName || !messageText) return fail("Please enter a name and message.");
    if (fromName.length > 24) return fail("From name must be 24 characters or less.");
    if (messageText.length > 80) return fail("Message must be 80 characters or less.");
    if (hasTooLongRun(fromName, 18)) return fail("Please shorten the name or add spaces.");
    if (hasTooLongRun(messageText, 20)) return fail("Please add spaces or shorten your message.");

    const existing = await prisma.screenMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        status: true,
        moderationNotes: true,
      },
    });

    if (!existing) return fail("Message not found", 404);

    if (!["PENDING", "APPROVED", "ACTIVE"].includes(String(existing.status || ""))) {
      return fail(`Only pending, approved, or active shout-outs can be edited. Current status: ${existing.status}`);
    }

    const mod = moderateShoutoutText(fromName, messageText);
    if (mod.result === "BLOCK") {
      return fail("This message can’t be saved as written. Please revise and try again.");
    }

    const updated = await prisma.screenMessage.update({
      where: { id: messageId },
      data: {
        fromName,
        messageText,
        moderationNotes: existing.moderationNotes
          ? `${existing.moderationNotes} | Admin edited.`
          : "Admin edited.",
        autoTextModerationResult: "ALLOW",
        autoTextModerationReason: mod.reason || "ADMIN_EDIT_ALLOW",
        autoModeratedAt: new Date(),
      },
      select: {
        id: true,
        fromName: true,
        messageText: true,
        status: true,
      },
    });

    return NextResponse.json({ ok: true, item: updated });
  } catch (err: any) {
    console.error("[admin/shoutouts/edit] error:", err?.message || err);
    return fail("Could not edit message", 500);
  }
}
