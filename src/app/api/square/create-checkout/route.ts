import { NextResponse } from "next/server";
import { PACKAGES, type PackageKey } from "@/lib/packages";
import crypto from "crypto";

export const runtime = "nodejs"; // important for crypto & raw webhook needs elsewhere

const SQUARE_BASE_URL = "https://connect.squareup.com";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

export async function POST(req: Request) {
  try {
    const { packageKey, buyerEmail, sessionId } = (await req.json()) as {
      packageKey: PackageKey;
      buyerEmail?: string;
      sessionId?: string; // your app’s session identifier if you have one
    };

    const pkg = PACKAGES[packageKey];
    if (!pkg) {
      return NextResponse.json({ error: "Invalid packageKey" }, { status: 400 });
    }

    const accessToken = mustEnv("SQUARE_ACCESS_TOKEN");
    const locationId = mustEnv("SQUARE_LOCATION_ID");
    const baseUrl = mustEnv("APP_BASE_URL");

    // IMPORTANT: attach metadata so webhook can know what to grant
    const body = {
      idempotency_key: crypto.randomUUID(),
      quick_pay: {
        name: pkg.label,
        price_money: { amount: pkg.priceCents, currency: "USD" },
        location_id: locationId,
      },
      checkout_options: {
        redirect_url: `${baseUrl}/checkout/success`,
        // You can also include a cancellation URL via your own UI
        // but Square may not always call it depending on user behavior.
      },
      pre_populated_data: buyerEmail
        ? {
            buyer_email: buyerEmail,
          }
        : undefined,
      // metadata is very helpful for fulfillment
      metadata: {
        packageKey,
        credits: String(pkg.credits),
        sessionId: sessionId || "",
      },
    };

    const r = await fetch(`${SQUARE_BASE_URL}/v2/online-checkout/payment-links`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await r.json();

    if (!r.ok) {
      return NextResponse.json({ error: data }, { status: r.status });
    }

    // This is the Square-hosted checkout URL
    const checkoutUrl = data?.payment_link?.url as string | undefined;

    if (!checkoutUrl) {
      return NextResponse.json(
        { error: "Square did not return a checkout URL", raw: data },
        { status: 500 }
      );
    }

    return NextResponse.json({ checkoutUrl });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Server error" },
      { status: 500 }
    );
  }
}