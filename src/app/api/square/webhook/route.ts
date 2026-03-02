import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";

const SQUARE_BASE = "https://connect.squareup.com";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function verifySquareSignature(rawBody: string, signatureHeader: string | null, webhookUrl: string) {
  if (!signatureHeader) return false;
  const signatureKey = mustEnv("SQUARE_WEBHOOK_SIGNATURE_KEY");

  // Square signature payload = webhookUrl + rawBody
  const payload = webhookUrl + rawBody;
  const hmac = crypto.createHmac("sha256", signatureKey);
  hmac.update(payload, "utf8");
  const expected = hmac.digest("base64");

  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

async function squareGet(path: string) {
  const accessToken = mustEnv("SQUARE_ACCESS_TOKEN");
  const res = await fetch(`${SQUARE_BASE}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-square-hmacsha256-signature");

  const webhookUrl = mustEnv("APP_BASE_URL") + "/api/square/webhook";
  if (!verifySquareSignature(rawBody, signature, webhookUrl)) {
    return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(rawBody);

  // Works for payment.updated events
  const paymentId =
    event?.data?.id ||
    event?.data?.object?.payment?.id ||
    event?.data?.object?.id;

  if (!paymentId) return NextResponse.json({ received: true, ignored: "no paymentId" });

  // Idempotency: never grant twice
  const already = await prisma.processedPayment.findUnique({ where: { paymentId } });
  if (already) return NextResponse.json({ received: true, ignored: "already processed" });

  // Fetch payment truth from Square
  const payment = (await squareGet(`/v2/payments/${paymentId}`))?.payment;
  if (!payment) return NextResponse.json({ received: true, ignored: "payment not found" });
  if (payment.status !== "COMPLETED") {
    return NextResponse.json({ received: true, ignored: `status=${payment.status}` });
  }

  const orderId = payment.order_id;
  if (!orderId) return NextResponse.json({ received: true, ignored: "no order_id" });

  // Fetch order to read reference_id
  const order = (await squareGet(`/v2/orders/${orderId}`))?.order;
  const referenceId = order?.reference_id as string | undefined;

  // KEY FILTER: only process RemixRequests orders
  if (!referenceId || !referenceId.startsWith("RR:")) {
    return NextResponse.json({ received: true, ignored: "not RR order" });
  }

  const pending = await prisma.pendingCheckout.findUnique({ where: { referenceId } });
  if (!pending) return NextResponse.json({ received: true, ignored: "no pending checkout" });
  if (pending.consumedAt) return NextResponse.json({ received: true, ignored: "already consumed" });

  const identity = await prisma.identity.findUnique({ where: { id: pending.identityId } });
  if (!identity) return NextResponse.json({ received: true, ignored: "identity missing" });

  await prisma.$transaction(async (tx) => {
    await tx.processedPayment.create({ data: { paymentId } });

    await tx.pendingCheckout.update({
      where: { referenceId },
      data: { consumedAt: new Date(), paymentId },
    });

    await tx.creditLedger.create({
      data: {
        locationId: identity.locationId,
        emailHash: identity.emailHash,
        delta: pending.credits,
        reason: `square:${pending.packageKey}`,
      },
    });
  });

  return NextResponse.json({ received: true });
}