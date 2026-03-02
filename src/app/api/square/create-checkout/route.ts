import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { PACKAGES, type PackageKey } from "@/lib/packages";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

  const text = await res.text();
  let data: any = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const err = new Error("Square API error");
    (err as any).squareStatus = res.status;
    (err as any).squareBody = data;
    throw err;
  }

  return data;
}

function safeStr(x: any) {
  return typeof x === "string" ? x : "";
}

export async function POST(req: Request) {
  const reqId = crypto.randomUUID();

  try {
    let body: any = null;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON body." }, { status: 400 });
    }

    const location = safeStr(body.location).trim();
    const identityId = safeStr(body.identityId).trim();
    const packageKey = safeStr(body.packageKey).trim() as PackageKey;

    // Optional: allows safe retries (client generates UUID once)
    const clientRequestId = safeStr(body.clientRequestId).trim(); // optional

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

    // Stable idempotency seed for this request.
    // If client provides a UUID, we can safely retry without double-creating checkout links.
    const idemSeed = clientRequestId || crypto.randomUUID();

    // Bulletproof RR tag: ONLY our app makes these
// Square order.reference_id must be <= 40 chars.
// Use a short token and map it in PendingCheckout.
const token = crypto.randomBytes(12).toString("hex"); // 24 chars
const referenceId = `RR:${token}`; // 3 + 1 + 24 = 28 chars
    console.log("CHECKOUT_START", {
      reqId,
      locationSlug: location,
      locationId: loc.id,
      identityId,
      packageKey,
      credits: pkg.credits,
      priceCents: pkg.priceCents,
      hasClientRequestId: Boolean(clientRequestId),
    });

    // 1) Create Square Order with reference_id
    const orderRes = await squareFetch("/v2/orders", {
      method: "POST",
      body: JSON.stringify({
        idempotency_key: idemSeed, // safe retry if clientRequestId is used
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
        // Different idempotency key than order creation, but still stable per request
        idempotency_key: crypto.createHash("sha256").update(`pl:${idemSeed}`).digest("hex").slice(0, 40),
        order_id: orderId,
        checkout_options: {
          redirect_url: `${baseUrl}/checkout/success`,
        },
      }),
    });

    const checkoutUrl = linkRes?.payment_link?.url;
    const paymentLinkId = linkRes?.payment_link?.id;
    if (!checkoutUrl) throw new Error("Square did not return payment_link.url");

    // 3) Store pending mapping so webhook knows who to credit
    // IMPORTANT: This should not explode on duplicates if someone double-clicks and we retry
    // We’re storing by referenceId (assumed unique). If your schema doesn’t have unique(referenceId),
    // we should add it in Prisma (recommended).
    await prisma.pendingCheckout.create({
      data: {
        referenceId,
        identityId,
        location,
        packageKey,
        credits: pkg.credits,
        amountCents: pkg.priceCents,
        currency: "USD",
        // Optional if your model has fields:
        // squareOrderId: orderId,
        // squarePaymentLinkId: paymentLinkId,
      },
    });

    console.log("CHECKOUT_OK", { reqId, referenceId, orderId, paymentLinkId });

    return NextResponse.json({ ok: true, checkoutUrl, referenceId });
  } catch (e: any) {
    // Square error surface
    if (e?.squareStatus) {
console.error("CHECKOUT_SQUARE_ERROR", {
  reqId,
  squareStatus: e.squareStatus,
  squareBody: JSON.stringify(e.squareBody),
});
      return NextResponse.json(
        { ok: false, error: "Square error", details: e.squareBody },
        { status: 502 }
      );
    }

    console.error("CHECKOUT_FATAL", { reqId, message: e?.message || String(e), stack: e?.stack });
    return NextResponse.json({ ok: false, error: e?.message || "Server error" }, { status: 500 });
  }
}