import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getCookieUsername(cookieHeader: string | null) {
  const raw = cookieHeader || "";
  const match = raw.match(/rr_admin_user=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function POST(req: Request) {
  const usernameFromCookie = getCookieUsername(req.headers.get("cookie"));

  if (!usernameFromCookie) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const currentUser = await prisma.staffUser.findUnique({
    where: { username: usernameFromCookie },
    select: { username: true, role: true, active: true },
  });

  if (!currentUser || !currentUser.active) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  if (currentUser.role !== "SUPER_ADMIN") {
    return NextResponse.json({ ok: false, error: "Not allowed." }, { status: 403 });
  }

  const body = await req.json();
  const id = String(body?.id || "").trim();
  const pin = body?.pin == null ? null : String(body.pin).trim();
  const role = body?.role == null ? null : String(body.role).trim();
  const active = typeof body?.active === "boolean" ? body.active : null;

  if (!id) {
    return NextResponse.json({ ok: false, error: "Missing user id." }, { status: 400 });
  }

  const target = await prisma.staffUser.findUnique({
    where: { id },
    select: { id: true, username: true },
  });

  if (!target) {
    return NextResponse.json({ ok: false, error: "User not found." }, { status: 404 });
  }

  const data: Record<string, unknown> = {};

  if (pin !== null) {
    if (!pin) {
      return NextResponse.json({ ok: false, error: "PIN cannot be blank." }, { status: 400 });
    }
    data.pin = pin;
  }

  if (role !== null) {
    if (role !== "STAFF" && role !== "SUPER_ADMIN") {
      return NextResponse.json({ ok: false, error: "Invalid role." }, { status: 400 });
    }
    data.role = role;
  }

  if (active !== null) {
    data.active = active;
  }

  const updated = await prisma.staffUser.update({
    where: { id },
    data,
    select: {
      id: true,
      username: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, item: updated });
}