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
  const username = String(body?.username || "").trim();
  const pin = String(body?.pin || "").trim();
  const role = String(body?.role || "STAFF").trim();

  if (!username) {
    return NextResponse.json({ ok: false, error: "Username is required." }, { status: 400 });
  }

  if (!pin) {
    return NextResponse.json({ ok: false, error: "PIN is required." }, { status: 400 });
  }

  if (role !== "STAFF" && role !== "SUPER_ADMIN") {
    return NextResponse.json({ ok: false, error: "Invalid role." }, { status: 400 });
  }

  const existing = await prisma.staffUser.findUnique({
    where: { username },
    select: { id: true },
  });

  if (existing) {
    return NextResponse.json({ ok: false, error: "Username already exists." }, { status: 400 });
  }

  const created = await prisma.staffUser.create({
    data: {
      username,
      pin,
      role,
      active: true,
    },
    select: {
      id: true,
      username: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, item: created });
}