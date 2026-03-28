import { NextRequest, NextResponse } from "next/server";
import { getDueInterstitialPrompt } from "@/lib/booth/get-due-interstitial-prompt";

type RouteContext = {
  params: {
    location: string;
  };
};

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const location = params.location;
    const sessionStartedAt = req.nextUrl.searchParams.get("sessionStartedAt");

    const result = await getDueInterstitialPrompt({
      location,
      sessionStartedAt,
      now: new Date(),
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[due-interstitial-prompt][GET] error", error);

    return NextResponse.json(
      {
        due: false,
        error: "Failed to evaluate due interstitial prompt.",
      },
      { status: 500 }
    );
  }
}