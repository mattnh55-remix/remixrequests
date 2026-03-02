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
      // Optional but recommended if you set it:
      ...(process.env.SQUARE_VERSION ? { "Square-Version": process.env.SQUARE_VERSION } : {}),
      ...(init?.headers || {}),
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err: any = new Error("Square error");
    err.squareStatus = res.status;
    err.squareBody = data;
    throw err;
  }
  return data;
}

export async function POST(req: Request) {
  const reqId = crypto.randomUUID();

  try {
    const body = await req.json().catch(() => ({}));

    const location = String(body.location || "").trim();
    const identityId = String(body.identityId || "").trim();
    const packageKey = String(body.packageKey || "").trim() as PackageKey;

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

    // Square order.reference_id must be <= 40 chars
    const token = crypto.randomBytes(12).toString("hex"); // 24 chars
    const referenceId = `RR:${token}`; // 28 chars

    // Create payment link with embedded order (Square creates the order)
    const linkRes = await squareFetch("/v2/online-checkout/payment-links", {
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
        checkout_options: {
          redirect_url: `${baseUrl}/checkout/success`,
        },
      }),
    });

     const checkoutUrl = linkRes?.payment_link?.url || linkRes?.payment_link?.long_url;
    if (!checkoutUrl) {
      console.error("CHECKOUT_FATAL", { reqId, message: "Square did not return payment_link.url", linkRes });
      return NextResponse.json({ ok: false, error: "Square did not return checkout URL." }, { status: 502 });
    }

    // Store pending mapping so webhook knows who to credit
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

    return NextResponse.json({ ok: true, checkoutUrl, referenceId });
  } catch (e: any) {
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