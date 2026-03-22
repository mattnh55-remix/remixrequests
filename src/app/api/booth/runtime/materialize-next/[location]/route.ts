import { NextResponse } from "next/server";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession } from "@/lib/validators";

export async function POST(
  req: Request,
  { params }: { params: { location: string } }
) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 }
    );
  }

  try {
    const locationSlug = String(params.location || "").trim();

    if (!locationSlug) {
      return NextResponse.json(
        { ok: false, error: "Missing location." },
        { status: 400 }
      );
    }

    const { loc } = await getRulesForLocation(locationSlug);
    const session = await getOrCreateCurrentSession(loc.id, 4);

    return NextResponse.json({
      ok: true,
      materialized: false,
      reason: "Materialization temporarily disabled pending hotfix.",
      sessionId: session.id,
      locationId: loc.id,
    });
  } catch (error) {
    console.error("materialize-next noop error", error);
    return NextResponse.json(
      { ok: false, error: "Could not process materialization request." },
      { status: 500 }
    );
  }
}