import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type EventPayload = {
  location: string;
  category: string;
  scheduleId?: string | null;
  assetId?: string | null;
  status: "PLAYED" | "SKIPPED";
  reason?: string | null;
};

function badRequest(message: string) {
  return NextResponse.json({ ok: false, error: message }, { status: 400 });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as EventPayload;

    if (!body?.location) return badRequest("location is required");
    if (!body?.category) return badRequest("category is required");
    if (!body?.status) return badRequest("status is required");

    if (body.status === "SKIPPED" && !String(body.reason ?? "").trim()) {
      return badRequest("skip reason is required");
    }

    if (body.status === "PLAYED" && !String(body.assetId ?? "").trim()) {
      return badRequest("assetId is required for PLAYED");
    }

    const created = await prisma.interstitialEvent.create({
      data: {
        locationId: body.location as any,
        category: body.category as any,
        scheduleId: body.scheduleId ?? null,
        assetId: body.assetId ?? null,
        status: body.status as any,
        reason: body.reason?.trim() || null,
      } as any,
    });

    return NextResponse.json({
      ok: true,
      eventId: created.id,
    });
  } catch (error) {
    console.error("[interstitial-event][POST] error", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Failed to create interstitial event.",
      },
      { status: 500 }
    );
  }
}