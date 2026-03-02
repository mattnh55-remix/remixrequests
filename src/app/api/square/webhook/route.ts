// src/app/api/square/webhook/route.ts
import { NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SQUARE_BASE = "https://connect.squareup.com";
const LOG = "RR_SQUARE_WEBHOOK";

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env var: ${name}`);
  return v;
}

function getWebhookUrl() {
  // BEST PRACTICE: set this to the exact webhook URL you configured in Square dashboard.
  // Example: https://remixrequests.com/api/square/webhook
  const explicit = process.env.SQUARE_WEBHOOK_URL;
  if (explicit) return explicit;

  // Fallback (works if Square is configured with the same URL)
  return mustEnv("APP_BASE_URL") + "/api/square/webhook";
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

function shortId() {
  // short readable id for logs
  return crypto.randomBytes(3).toString("hex"); // 6 chars
}

export async function POST(req: Request) {
  const reqId = crypto.randomUUID();
  const rid = shortId(); // small log-friendly id

  const logBase = { reqId, rid };

  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-square-hmacsha256-signature");
    const webhookUrl = getWebhookUrl();

    console.log(LOG, "START", {
      ...logBase,
      hasSignature: Boolean(signature),
      bodyBytes: rawBody?.length || 0,
    });

    if (!verifySquareSignature(rawBody, signature, webhookUrl)) {
      console.warn(LOG, "BAD_SIGNATURE", {
        ...logBase,
        hasSignature: Boolean(signature),
        webhookUrl,
      });
      return NextResponse.json({ ok: false, error: "Invalid signature" }, { status: 401 });
    }

    let event: any = null;
    try {
      event = rawBody ? JSON.parse(rawBody) : null;
    } catch {
      console.error(LOG, "BAD_JSON", { ...logBase });
      return NextResponse.json({ received: true, ignored: "bad json" });
    }

    const eventId = safeStr(event?.event_id || event?.id || event?.data?.id); // varies by type
    const eventType = safeStr(event?.type);
    const createdAt = safeStr(event?.created_at);

    // Works for payment.* events; Square’s payload varies.
    const paymentId =
      safeStr(event?.data?.id) ||
      safeStr(event?.data?.object?.payment?.id) ||
      safeStr(event?.data?.object?.id);

    console.log(LOG, "RECEIVED", { ...logBase, eventType, eventId, createdAt, paymentId: paymentId || null });

    if (!paymentId) {
      console.log(LOG, "IGNORED_NO_PAYMENT", { ...logBase, eventType, eventId });
      return NextResponse.json({ received: true, ignored: "no paymentId" });
    }

    // Idempotency: never grant twice for same paymentId
    const already = await prisma.processedPayment.findUnique({ where: { paymentId } });
    if (already) {
      console.log(LOG, "IDEMPOTENT_SKIP_ALREADY_PROCESSED", { ...logBase, paymentId });
      return NextResponse.json({ received: true, ignored: "already processed" });
    }

    // Fetch payment truth from Square
    const payment = (await squareGet(`/v2/payments/${paymentId}`))?.payment;
    if (!payment) {
      console.warn(LOG, "PAYMENT_NOT_FOUND", { ...logBase, paymentId });
      return NextResponse.json({ received: true, ignored: "payment not found" });
    }

    console.log(LOG, "PAYMENT_FETCHED", {
      ...logBase,
      paymentId,
      status: safeStr(payment.status),
      orderId: safeStr(payment.order_id) || null,
      amount: Number(payment?.amount_money?.amount || 0) || null,
      currency: safeStr(payment?.amount_money?.currency || "") || null,
    });

    if (payment.status !== "COMPLETED") {
      console.log(LOG, "IGNORED_PAYMENT_STATUS", {
        ...logBase,
        paymentId,
        status: payment.status,
      });
      return NextResponse.json({ received: true, ignored: `status=${payment.status}` });
    }

    const orderId = safeStr(payment.order_id);
    if (!orderId) {
      console.warn(LOG, "IGNORED_NO_ORDER_ID", { ...logBase, paymentId });
      return NextResponse.json({ received: true, ignored: "no order_id" });
    }

    // Fetch order to read reference_id
    const order = (await squareGet(`/v2/orders/${orderId}`))?.order;
    const referenceId = safeStr(order?.reference_id);

    console.log(LOG, "ORDER_FETCHED", {
      ...logBase,
      paymentId,
      orderId,
      referenceId: referenceId || null,
    });

    // KEY FILTER: only process RemixRequests orders
    if (!referenceId || !referenceId.startsWith("RR:")) {
      console.log(LOG, "IGNORED_NOT_RR", { ...logBase, paymentId, orderId, referenceId: referenceId || null });
      return NextResponse.json({ received: true, ignored: "not RR order" });
    }

    const pending = await prisma.pendingCheckout.findUnique({ where: { referenceId } });
    if (!pending) {
      console.warn(LOG, "NO_PENDING_CHECKOUT", { ...logBase, referenceId, paymentId, orderId });
      return NextResponse.json({ received: true, ignored: "no pending checkout" });
    }

    if (pending.consumedAt) {
      console.log(LOG, "IDEMPOTENT_SKIP_ALREADY_CONSUMED", {
        ...logBase,
        referenceId,
        paymentId,
        consumedAt: pending.consumedAt,
      });
      return NextResponse.json({ received: true, ignored: "already consumed" });
    }

    // Optional but recommended: validate amount/currency match pending record
    const paidAmount = Number(payment?.amount_money?.amount || 0);
    const paidCurrency = safeStr(payment?.amount_money?.currency || "");

    if (pending.amountCents && paidAmount && pending.amountCents !== paidAmount) {
      console.error(LOG, "AMOUNT_MISMATCH", {
        ...logBase,
        referenceId,
        expected: pending.amountCents,
        got: paidAmount,
      });
      return NextResponse.json({ received: true, ignored: "amount mismatch" });
    }

    if (pending.currency && paidCurrency && pending.currency !== paidCurrency) {
      console.error(LOG, "CURRENCY_MISMATCH", {
        ...logBase,
        referenceId,
        expected: pending.currency,
        got: paidCurrency,
      });
      return NextResponse.json({ received: true, ignored: "currency mismatch" });
    }

    const identity = await prisma.identity.findUnique({ where: { id: pending.identityId } });
    if (!identity) {
      console.error(LOG, "IDENTITY_MISSING", { ...logBase, referenceId, identityId: pending.identityId });
      return NextResponse.json({ received: true, ignored: "identity missing" });
    }

    console.log(LOG, "READY_TO_GRANT", {
      ...logBase,
      referenceId,
      paymentId,
      orderId,
      credits: pending.credits,
      packageKey: pending.packageKey,
      identityId: identity.id,
      locationId: identity.locationId,
    });

    // Transaction: mark processed + consume pending + grant credits
    await prisma.$transaction(async (tx) => {
      await tx.processedPayment.create({
        data: {
          paymentId,
          // Optional if your model has fields:
          // eventId,
          // orderId,
          // referenceId,
          // createdAt: new Date(),
        },
      });

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

    console.log(LOG, "GRANTED", {
      ...logBase,
      referenceId,
      paymentId,
      orderId,
      credits: pending.credits,
      identityId: identity.id,
      locationId: identity.locationId,
    });

    return NextResponse.json({ received: true });
  } catch (e: any) {
    if (e?.squareStatus) {
      console.error(LOG, "SQUARE_API_ERROR", {
        ...logBase,
        squareStatus: e.squareStatus,
        squareBody: e.squareBody,
      });
      // Return 200 so Square doesn't spam retries for our internal fetch errors,
      // but keep logs for investigation.
      return NextResponse.json({ received: true, ignored: "square fetch error" });
    }

    console.error(LOG, "FATAL", {
      ...logBase,
      message: e?.message || String(e),
      stack: e?.stack,
    });
    // Return 200 to avoid webhook retry storms; we rely on logs + DB to catch issues.
    return NextResponse.json({ received: true, ignored: "fatal" });
  }
}