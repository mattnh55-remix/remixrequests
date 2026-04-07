import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });

  res.cookies.set("rr_admin_user", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });

  return res;
}