// src/app/api/admin/shoutout-rules/[location]/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isAdminFromCookie } from "@/lib/adminAuth";

type Params = {
  params: { location: string };
};

export async function GET(req: Request, { params }: Params) {
  try {
    if (!isAdminFromCookie(req.headers.get("cookie"))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const locationSlug = decodeURIComponent(params.location || "");
    if (!locationSlug) {
      return NextResponse.json({ ok: false, error: "Missing location" }, { status: 400 });
    }

    const loc = await prisma.location.findUnique({
      where: { slug: locationSlug },
      select: { id: true, slug: true },
    });

    if (!loc) {
      return NextResponse.json({ ok: false, error: "Unknown location" }, { status: 404 });
    }

    let rules = await prisma.messageRuleset.findUnique({
      where: { locationId: loc.id },
    });

    if (!rules) {
      rules = await prisma.messageRuleset.create({
        data: {
          locationId: loc.id,
          enabled: true,
          costBasic: 3,
          costFeatured: 6,
          maxMessageChars: 80,
          maxFromNameChars: 24,
          displayDurationBasicSec: 10,
          displayDurationFeaturedSec: 15,
          approvalRequired: true,
          autoRefundRejected: true,
          maxPendingPerIdentity: 3,
          filterBlockMessage:
            "This message can’t be submitted as written. Please revise and try again.",
        },
      });
    }

    return NextResponse.json({
      ok: true,
      rules: {
        enabled: Boolean(rules.enabled),
        maxFromNameChars: Number(rules.maxFromNameChars ?? 24),
        maxMessageChars: Number(rules.maxMessageChars ?? 80),
        maxPendingPerIdentity: Number(rules.maxPendingPerIdentity ?? 3),
        filterBlockMessage:
          String(
            rules.filterBlockMessage ||
              "This message can’t be submitted as written. Please revise and try again."
          ),
      },
    });
  } catch (err) {
    console.error("ADMIN_SHOUTOUT_RULES_GET_ERROR", err);
    return NextResponse.json(
      { ok: false, error: "Failed to load shout-out rules." },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, { params }: Params) {
  try {
    if (!isAdminFromCookie(req.headers.get("cookie"))) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const locationSlug = decodeURIComponent(params.location || "");
    if (!locationSlug) {
      return NextResponse.json({ ok: false, error: "Missing location" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 });
    }

    const loc = await prisma.location.findUnique({
      where: { slug: locationSlug },
      select: { id: true, slug: true },
    });

    if (!loc) {
      return NextResponse.json({ ok: false, error: "Unknown location" }, { status: 404 });
    }

    const enabled = Boolean(body.enabled);
    const maxFromNameChars = Math.max(1, Number(body.maxFromNameChars ?? 24) || 24);
    const maxMessageChars = Math.max(1, Number(body.maxMessageChars ?? 80) || 80);
    const maxPendingPerIdentity = Math.max(1, Number(body.maxPendingPerIdentity ?? 3) || 3);
    const filterBlockMessage = String(
      body.filterBlockMessage ||
        "This message can’t be submitted as written. Please revise and try again."
    ).trim();

    const existing = await prisma.messageRuleset.findUnique({
      where: { locationId: loc.id },
    });

    const rules = existing
      ? await prisma.messageRuleset.update({
          where: { locationId: loc.id },
          data: {
            enabled,
            maxFromNameChars,
            maxMessageChars,
            maxPendingPerIdentity,
            filterBlockMessage,
          },
        })
      : await prisma.messageRuleset.create({
          data: {
            locationId: loc.id,
            enabled,
            costBasic: 3,
            costFeatured: 6,
            maxMessageChars,
            maxFromNameChars,
            displayDurationBasicSec: 10,
            displayDurationFeaturedSec: 15,
            approvalRequired: true,
            autoRefundRejected: true,
            maxPendingPerIdentity,
            filterBlockMessage,
          },
        });

    return NextResponse.json({
      ok: true,
      rules: {
        enabled: Boolean(rules.enabled),
        maxFromNameChars: Number(rules.maxFromNameChars ?? 24),
        maxMessageChars: Number(rules.maxMessageChars ?? 80),
        maxPendingPerIdentity: Number(rules.maxPendingPerIdentity ?? 3),
        filterBlockMessage:
          String(
            rules.filterBlockMessage ||
              "This message can’t be submitted as written. Please revise and try again."
          ),
      },
    });
  } catch (err) {
    console.error("ADMIN_SHOUTOUT_RULES_SET_ERROR", err);
    return NextResponse.json(
      { ok: false, error: "Failed to save shout-out rules." },
      { status: 500 }
    );
  }
}