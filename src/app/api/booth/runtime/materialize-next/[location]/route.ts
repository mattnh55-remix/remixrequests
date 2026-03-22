import { NextResponse } from "next/server";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession } from "@/lib/validators";
import { materializeNextInterstitial } from "@/lib/booth/materialize-next-interstitial";

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

    const result = await materializeNextInterstitial({
      locationId: loc.id,
      sessionId: session.id,
      profile: "GENERAL",
    });

    return NextResponse.json({
      ...result,
      sessionId: session.id,
      locationId: loc.id,
    });
  } catch (error) {
    console.error("materialize-next error", error);
    return NextResponse.json(
      { ok: false, error: "Could not process materialization request." },
      { status: 500 }
    );
  }
}
