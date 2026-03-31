// src/app/api/booth/due-interstitial-prompt/[location]/route.ts


import { NextRequest, NextResponse } from "next/server";
import { getDueInterstitialPrompt } from "@/lib/booth/get-due-interstitial-prompt";

type RouteContext = {
  params: {
    location: string;
  };
};

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const location = String(params.location ?? "").trim();
    const sessionStartedAt = req.nextUrl.searchParams.get("sessionStartedAt");
const pausedElapsedMsRaw = req.nextUrl.searchParams.get("pausedElapsedMs");
const pausedElapsedMs = Math.max(0, Number(pausedElapsedMsRaw || 0));

    if (!location) {
      return NextResponse.json(
        {
          due: false,
          error: "Missing location.",
        },
        { status: 400 }
      );
    }

const result = await getDueInterstitialPrompt({
  location,
  sessionStartedAt,
  pausedElapsedMs,
  now: new Date(),
});

    return NextResponse.json(result);
  } catch (error) {
    console.error("[GET /api/booth/due-interstitial-prompt/[location]]", error);

    return NextResponse.json(
      {
        due: false,
        error: "Failed to evaluate due interstitial prompt.",
      },
      { status: 500 }
    );
  }
}