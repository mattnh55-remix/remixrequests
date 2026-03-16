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

    const body = await req.json().catch(() => null);
    const id = String(body?.id || "").trim();
    if (!id) return fail("Missing id");

    await prisma.redemptionCode.delete({
      where: { id },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("[admin/redemption-codes/delete] error:", err?.message || err);
    return fail("Could not delete code", 500);
  }
}
