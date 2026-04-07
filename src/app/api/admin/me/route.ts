import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const cookie = req.headers.get("cookie") || "";
  const match = cookie.match(/rr_admin_user=([^;]+)/);

  if (!match) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const username = decodeURIComponent(match[1]);

  const user = await prisma.staffUser.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      role: true,
      active: true,
    },
  });

  if (!user || !user.active) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    user,
  });
}