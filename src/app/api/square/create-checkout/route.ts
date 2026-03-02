import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { PACKAGES, type PackageKey } from "@/lib/packages";

export const runtime = "nodejs";

const SQUARE_BASE = "https://connect.squareup.com";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

async function squareFetch(path: string, init?: RequestInit) {
  const accessToken = mustEnv("SQUARE_ACCESS_TOKEN");
  const res = await fetch(`${SQUARE_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const location = String(body.location || "");
    const identityId = String(body.identityId || "");
    const packageKey = String(body.packageKey || "") as PackageKey;

    if (!location || !identityId || !packageKey) {
      return NextResponse.json({ ok: false, error: "Missing fields." }, { status: 400 });
    }

    const pkg = (PACKAGES as any)[packageKey] as { credits: number; priceCents: number } | undefined;
    if (!pkg) {
      return NextResponse.json({ ok: false, error: "Invalid package." }, { status: 400 });
    }

    // Validate location + identity exist
    const loc = await prisma.location.findUnique({ where: { slug: location } });
    if (!loc) return NextResponse.json({ ok: false, error: "Invalid location." }, { status: 400 });

    const identity = await prisma.identity.findUnique({ where: { id: identityId } });
    if (!identity || identity.locationId !== loc.id) {
      return NextResponse.json({ ok: false, error: "Invalid identity." }, { status: 400 });
    }

    const baseUrl = mustEnv("APP_BASE_URL");
    const squareLocationId = mustEnv("SQUARE_LOCATION_ID");

    // Bulletproof tag: ONLY our app makes these
    const referenceId = `RR:${loc.id}:${identityId}:${crypto.randomUUID()}`;

    // 1) Create Square Order with reference_id
    const orderRes = await squareFetch("/v2/orders", {
      method: "POST",
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        order: {
          location_id: squareLocationId,
          reference_id: referenceId,
          line_items: [
            {
              name: "RemixRequests Credits",
              quantity: "1",
              base_price_money: { amount: pkg.priceCents, currency: "USD" },
              note: `${pkg.credits} credits (${packageKey})`,
            },
          ],
        },
      }),
    });

    const orderId = orderRes?.order?.id;
    if (!orderId) throw new Error("Square did not return order.id");

    // 2) Create Square-hosted payment link for that order
    const linkRes = await squareFetch("/v2/online-checkout/payment-links", {
      method: "POST",
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        order_id: orderId,
        checkout_options: {
          redirect_url: `${baseUrl}/checkout/success`,
        },
      }),
    });

    const checkoutUrl = linkRes?.payment_link?.url;
    if (!checkoutUrl) throw new Error("Square did not return payment_link.url");

    // 3) Store pending mapping so webhook knows who to credit
    await prisma.pendingCheckout.create({
      data: {
        referenceId,
        identityId,
        location,
        packageKey,
        credits: pkg.credits,
        amountCents: pkg.priceCents,
        currency: "USD",
      },
    });

    return NextResponse.json({ ok: true, checkoutUrl });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}