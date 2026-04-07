import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const { username, pin } = await req.json();

  if (!username || !pin) {
    return NextResponse.json({ ok: false });
  }

  const user = await prisma.staffUser.findUnique({
    where: { username },
  });

  if (!user || !user.active || user.pin !== pin) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });

  // 🍪 set session cookie (VERY simple)
  res.cookies.set("rr_admin_user", user.username, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  });

  return res;
}