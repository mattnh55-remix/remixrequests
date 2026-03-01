import { NextResponse } from "next/server";
import crypto from "crypto";

function sign(payload: any) {
  const secret = process.env.ADMIN_JWT_SECRET || "dev";
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = crypto.createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

export async function POST(req: Request) {
  const body = await req.json();
  const pin = String(body.pin || "");
  if (pin !== (process.env.ADMIN_PIN || "")) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const token = sign({ role: "admin", iat: Date.now() });

  const res = NextResponse.json({ ok: true });
  res.cookies.set("rm_admin", token, { httpOnly: true, sameSite: "lax", path: "/" });
  return res;
}
