import { NextResponse } from "next/server";
import { getInterstitialAssets } from "@/lib/booth/get-interstitial-assets";

export async function GET(
  _req: Request,
  { params }: { params: { location: string } }
) {
  try {
    const locationId = params.location;

    if (!locationId) {
      return NextResponse.json(
        { ok: false, error: "Missing location." },
        { status: 400 }
      );
    }

    const assets = await getInterstitialAssets(locationId);

    return NextResponse.json({
      ok: true,
      assets,
    });
  } catch (error) {
    console.error("Failed to load interstitial assets", error);

    return NextResponse.json(
      { ok: false, error: "Could not load interstitial assets." },
      { status: 500 }
    );
  }
}