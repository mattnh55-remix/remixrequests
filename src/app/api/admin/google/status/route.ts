import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdminFromCookie } from "@/lib/adminAuth";

export async function GET(req: Request) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  const locationSlug = new URL(req.url).searchParams.get("locationSlug") || "remixrequests";
  const connection = await prisma.googleBusinessConnection.findFirst({
    where: { location: { slug: locationSlug } },
    select: { displayName: true, updatedAt: true },
  });
  return NextResponse.json({ ok: true, connected: Boolean(connection), connection: connection || null });
}
