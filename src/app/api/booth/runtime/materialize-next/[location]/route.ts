import { NextResponse } from "next/server";
import { isAdminFromCookie } from "@/lib/adminAuth";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession } from "@/lib/validators";
import { materializeNextInterstitial } from "@/lib/booth/materialize-next-interstitial";

function jsonFail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(
  req: Request,
  { params }: { params: { location: string } }
) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return jsonFail("Unauthorized.", 401);
  }

  try {
    const locationSlug = String(params.location || "").trim();

    if (!locationSlug) {
      return jsonFail("Missing location.");
    }

    const { loc } = await getRulesForLocation(locationSlug);
    const session = await getOrCreateCurrentSession(loc.id, 4);

    const body = await req.json().catch(() => ({}));
    const profile =
      typeof body?.profile === "string" && body.profile.trim()
        ? body.profile.trim()
        : "GENERAL";

    const result = await materializeNextInterstitial({
      locationId: loc.id,
      sessionId: session.id,
      profile: profile as
        | "GENERAL"
        | "FAMILY"
        | "ADULT"
        | "BIRTHDAY"
        | "SCHOOL"
        | "PRIVATE_EVENT",
    });

    return NextResponse.json({
      ...result,
      sessionId: session.id,
      locationId: loc.id,
      locationSlug,
    });
  } catch (error) {
    console.error("materialize-next error", error);
    return jsonFail("Could not process materialization request.", 500);
  }
}
