import { NextResponse } from "next/server";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { listGoogleReviews } from "@/lib/google-business";

export async function GET(req: Request) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  try {
    const locationSlug = new URL(req.url).searchParams.get("locationSlug") || "remixrequests";
    return NextResponse.json({ ok: true, reviews: await listGoogleReviews(locationSlug) });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error?.message || "Could not load Google reviews." }, { status: 400 });
  }
}
