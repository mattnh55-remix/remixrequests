import { NextResponse } from "next/server";
import crypto from "crypto";

export const runtime = "nodejs";

// NOTE: In App Router Route Handlers, we can read raw text safely.
const SQUARE_BASE_URL = "https://connect.squareup.com";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var ${name}`);
  return v;
}

function verifySquareSignature(rawBody: string, signatureHeader: string | null, url: string) {
  if (!signatureHeader) return false;

  const signatureKey = mustEnv("SQUARE_WEBHOOK_SIGNATURE_KEY");

  // Square signature is HMAC-SHA256 of (notification_url + body)
  const payload = url + rawBody;

  const hmac = crypto.createHmac("sha256", signatureKey);
  hmac.update(payload, "utf8");
  const expected = hmac.digest("base64");

  // timing-safe compare
  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function fetchPayment(paymentId: string) {
  const accessToken = mustEnv("SQUARE_ACCESS_TOKEN");

  const r = await fetch(`${SQUARE_BASE_URL}/v2/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const data = await r.json();
  if (!r.ok) throw new Error(`Failed to fetch payment: ${JSON.stringify(data)}`);
  return data?.payment;
}

/**
 * Replace this with your Prisma/Supabase logic.
 * MUST be idempotent by paymentId (store processed payments).
 */
async function grantCreditsOnce(args: {
  paymentId: string;
  buyerEmail?: string;
  credits: number;
  packageKey?: string;
  sessionId?: string;
  amountCents: number;
  currency: string;
}) {
  // PSEUDO:
  // 1) Check if paymentId already processed -> if yes return
  // 2) Resolve user by buyerEmail (or sessionId -> email)
  // 3) Add credits to user account
  // 4) Insert row: processed_payments(paymentId, credits, buyerEmail, createdAt, raw)
  //
  // Example shape:
  // await prisma.processedPayment.create({ ... })
  // await prisma.user.update({ where: { email: buyerEmail }, data: { credits: { increment: credits }}})
}

export async function POST(req: Request) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-square-hmacsha256-signature");

    // This MUST match the exact publicly configured webhook URL in Square dashboard.
    const webhookUrl = mustEnv("APP_BASE_URL") + "/api/square/webhook";

    const ok = verifySquareSignature(rawBody, signature, webhookUrl);
    if (!ok) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(rawBody);

    // Typical event types you’ll see: payment.created, payment.updated
    const eventType = event?.type as string | undefined;

    // Grab payment_id depending on event structure
    const paymentId =
      event?.data?.id ||
      event?.data?.object?.payment?.id ||
      event?.data?.object?.id;

    if (!paymentId) {
      return NextResponse.json({ received: true, note: "No paymentId" });
    }

    // Fetch payment to confirm status (don’t trust webhook payload alone)
    const payment = await fetchPayment(paymentId);

    if (payment?.status !== "COMPLETED") {
      // Acknowledge webhook; do nothing yet
      return NextResponse.json({ received: true, status: payment?.status, eventType });
    }

    const amountCents = payment?.amount_money?.amount ?? 0;
    const currency = payment?.amount_money?.currency ?? "USD";

    // Metadata from Payment Links usually comes through via `payment.note` or `payment.order_id` depending on config.
    // BUT since we set `metadata` on the payment link creation, Square returns it on the payment link resource,
    // not always directly on the payment. If you need guaranteed metadata, you can:
    // - Look up the payment link by order/payment link id, OR
    // - Encode packageKey in "note" (supported on orders), OR
    // - Use fixed amount -> infer package by amount.
    //
    // Since you said fixed packages, simplest & reliable: infer by amount.
    const amountToCredits: Record<number, number> = {
      500: 10,
      1000: 25,
      1500: 35,
      2000: 50,
    };

    const credits = amountToCredits[amountCents];
    if (!credits) {
      // If mismatch, you can log and alert instead of granting
      return NextResponse.json(
        { received: true, error: "Unknown amount", amountCents },
        { status: 200 }
      );
    }

    const buyerEmail =
      payment?.buyer_email_address ||
      payment?.receipt_email_address ||
      undefined;

    await grantCreditsOnce({
      paymentId,
      buyerEmail,
      credits,
      amountCents,
      currency,
    });

    return NextResponse.json({ received: true });
  } catch (err: any) {
    // Return 200 to prevent Square retry storms only if you’ve already verified signature & processed safely.
    // Here, if it errors early, a non-200 helps you notice issues. In production, you may prefer 200 with logging.
    return NextResponse.json(
      { error: err?.message || "Webhook error" },
      { status: 500 }
    );
  }
}