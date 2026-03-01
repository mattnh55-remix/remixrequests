import { NextResponse } from "next/server";
import { getRulesForLocation } from "@/lib/rules";
import { isAdminFromCookie } from "@/lib/adminAuth";

export async function GET(req: Request, { params }: { params: { location: string } }) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const { loc, rules } = await getRulesForLocation(params.location);
  return NextResponse.json({ ok: true, location: { slug: loc.slug, name: loc.name }, rules });
}
