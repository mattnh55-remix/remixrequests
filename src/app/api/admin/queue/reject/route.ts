import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";

export async function POST(req: Request) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await req.json();
  const requestId = String(body.requestId || "");
  const reason = String(body.reason || "Rejected");

  const r = await prisma.request.findUnique({ where: { id: requestId } });
  if (!r) return NextResponse.json({ ok: false }, { status: 404 });

  await prisma.request.update({
    where: { id: requestId },
    data: { status: "REJECTED", rejectedAt: new Date(), rejectReason: reason }
  });

  return NextResponse.json({ ok: true });
}
