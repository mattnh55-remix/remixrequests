import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function getCookieUsername(cookieHeader: string | null) {
  const raw = cookieHeader || "";
  const match = raw.match(/rr_admin_user=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

export async function GET(req: Request) {
  const username = getCookieUsername(req.headers.get("cookie"));

  if (!username) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  const currentUser = await prisma.staffUser.findUnique({
    where: { username },
    select: { username: true, role: true, active: true },
  });

  if (!currentUser || !currentUser.active) {
    return NextResponse.json({ ok: false, error: "Not signed in." }, { status: 401 });
  }

  if (currentUser.role !== "SUPER_ADMIN") {
    return NextResponse.json({ ok: false, error: "Not allowed." }, { status: 403 });
  }

  const items = await prisma.staffUser.findMany({
    orderBy: { username: "asc" },
    select: {
      id: true,
      username: true,
      role: true,
      active: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ ok: true, items });
}