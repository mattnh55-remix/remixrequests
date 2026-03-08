import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonFail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const messageId = String(body.messageId || "").trim();

    if (!messageId) return jsonFail("Missing messageId.", 400);

    const existing = await prisma.screenMessage.findUnique({
      where: { id: messageId },
      select: {
        id: true,
        status: true,
        approvedAt: true,
      },
    });

    if (!existing) return jsonFail("Message not found.", 404);

    if (existing.status !== "PENDING") {
      return jsonFail("Only pending messages can be approved.", 400);
    }

    await prisma.screenMessage.update({
      where: { id: messageId },
      data: {
        status: "APPROVED",
        approvedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[admin/shoutouts/approve] error:", err?.message || err);
    return jsonFail("Internal error.", 500);
  }
}