// src/app/api/public/shoutouts/submit/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMessageRules } from "@/lib/messageRules";
import { moderateShoutoutText } from "@/lib/shoutoutModeration";
import { getOrCreateCurrentSession } from "@/lib/validators";
import { hashEmail } from "@/lib/security";
import { getLegacyProductAlias, getShoutoutProduct } from "@/lib/shoutoutProducts";

function jsonFail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function maskBlockedName(input: string) {
  const clean = String(input || "").trim();
  if (!clean) return "Blocked Sender";
  if (clean.length === 1) return `${clean}…`;
  return `${clean.slice(0, 1)}${"•".repeat(Math.max(1, Math.min(clean.length - 1, 6)))}`;
}

function hasTooLongRun(input: string, maxRun = 20) {
  let run = 0;

  for (const ch of String(input || "")) {
    if (/\s/.test(ch)) {
      run = 0;
      continue;
    }

    run += 1;
    if (run > maxRun) return true;
  }

  return false;
}

function hasTooManyRepeatedChars(input: string, maxRepeat = 6) {
  let last = "";
  let run = 0;

  for (const ch of Array.from(String(input || ""))) {
    if (ch === last) {
      run += 1;
      if (run > maxRepeat) return true;
    } else {
      last = ch;
      run = 1;
    }
  }

  return false;
}

function hasTooManyEmoji(input: string, maxEmoji = 10) {
  const matches =
    String(input || "").match(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu
    ) || [];

  return matches.length > maxEmoji;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { location, identityId, email, fromName, messageText, productKey, tier } = body || {};

    if (!location || !email || !fromName || !messageText || !(productKey || tier)) {
      return jsonFail("Missing required fields");
    }

    const selectedKey = getLegacyProductAlias(productKey || tier);
    if (!selectedKey) return jsonFail("Invalid shout-out selection.");

    const product = getShoutoutProduct(selectedKey);
    if (!product) return jsonFail("Unknown shout-out product.");
    if (!product.enabled) {
      return jsonFail(
        product.hasImage
          ? "Photo shout-outs are coming soon."
          : "That shout-out option is currently unavailable."
      );
    }

    const { loc, rules } = await getMessageRules(location);
    if (!rules.enabled) return jsonFail("Shout-outs are currently disabled");

    const session = await getOrCreateCurrentSession(loc.id, 4);
    const emailHash = hashEmail(email);
    const cleanFrom = String(fromName || "").trim();
    const cleanBody = String(messageText || "").trim();

if (!cleanFrom || !cleanBody) return jsonFail("Please enter your name and message.");

if (cleanFrom.length > Number(rules.maxFromNameChars || 24)) {
  return jsonFail(`From name must be ${Number(rules.maxFromNameChars || 24)} characters or less.`);
}

if (hasTooLongRun(cleanFrom, 18)) {
  return jsonFail("Please shorten the name or add spaces.");
}

if (cleanBody.length > Number(rules.maxMessageChars || 80)) {
  return jsonFail(`Message must be ${Number(rules.maxMessageChars || 80)} characters or less.`);
}

if (hasTooLongRun(cleanBody, 20)) {
  return jsonFail("Please add spaces or shorten your message.");
}
if (hasTooLongRun(cleanFrom, 18)) {
  return jsonFail("Please shorten the name or add spaces.");
}

if (hasTooLongRun(cleanBody, 20)) {
  return jsonFail("Please add spaces or shorten your message.");
}

if (hasTooManyRepeatedChars(cleanFrom, 6)) {
  return jsonFail("Please remove repeated characters from the name.");
}

if (hasTooManyRepeatedChars(cleanBody, 6)) {
  return jsonFail("Please remove repeated characters from the message.");
}

if (hasTooManyEmoji(cleanBody, 10)) {
  return jsonFail("Please use fewer emoji.");
}

    const pendingCount = await prisma.screenMessage.count({
      where: {
        locationId: loc.id,
        sessionId: session.id,
        emailHash,
        status: { in: ["PENDING", "APPROVED", "ACTIVE"] },
      },
    });

    if (pendingCount >= Number(rules.maxPendingPerIdentity || 3)) {
      return jsonFail("You already have the maximum number of active shout-outs for this session.");
    }

    const mod = moderateShoutoutText(cleanFrom, cleanBody);
    if (mod.result === "BLOCK") {
      await prisma.screenMessage.create({
        data: {
          locationId: loc.id,
          sessionId: session.id,
          identityId: identityId || null,
          emailHash,
          fromName: maskBlockedName(cleanFrom),
          messageText: "[BLOCKED BY AUTOMATIC FILTER]",
          tier: product.key,
          creditsCost: 0,
          status: "BLOCKED_TEXT",
          displayDurationSec: 0,
          sortWeight: product.weight,
          moderationNotes: "Raw text hidden from staff because the automatic filter blocked it.",
          autoTextModerationResult: "BLOCK",
          autoTextModerationReason: mod.reason || "FILTER_BLOCK",
          autoModeratedAt: new Date(),
        },
      });

      return jsonFail(rules.filterBlockMessage || "That shout-out could not be submitted.");
    }

    const balanceAgg = await prisma.creditLedger.aggregate({
      _sum: { delta: true },
      where: { locationId: loc.id, emailHash },
    });
    const balance = balanceAgg._sum.delta || 0;
    if (balance < product.creditsCost) return jsonFail("Not enough credits");

 const result = await prisma.$transaction(
  async (tx) => {

    const activeSession = await tx.session.findFirst({
      where: {
        locationId: loc.id,
        endsAt: { gt: new Date() } // Use the clock, not a boolean
      },
      select: { endsAt: true },
      orderBy: { createdAt: "desc" }
    });

    await tx.creditLedger.create({
      data: {
        locationId: loc.id,
        emailHash,
        delta: -product.creditsCost,
        reason: `SHOUT_${product.key}`,
        expiresAt: activeSession?.endsAt ?? null
      },
    });
        return tx.screenMessage.create({
          data: {
            locationId: loc.id,
            sessionId: session.id,
            identityId: identityId || null,
            emailHash,
            fromName: cleanFrom,
            messageText: cleanBody,
            tier: product.key,
            creditsCost: product.creditsCost,
            status: "PENDING",
            displayDurationSec: product.displayDurationSec,
            sortWeight: product.weight,
            autoTextModerationResult: "ALLOW",
            autoTextModerationReason: mod.reason || "ALLOW",
            autoModeratedAt: new Date(),
          },
        });
      },
      { isolationLevel: "Serializable" }
    );

    const updatedBalanceAgg = await prisma.creditLedger.aggregate({
      _sum: { delta: true },
      where: { locationId: loc.id, emailHash },
    });

    return NextResponse.json({
      ok: true,
      status: "PENDING",
      moderationStatus: "pending_review",
      message: "Your shout-out was submitted for review.",
      messageId: result.id,
      balance: Math.max(updatedBalanceAgg._sum.delta || 0, 0),
      productKey: product.key,
      productTitle: product.title,
    });
  } catch (err) {
    console.error("SHOUTOUT_SUBMIT_ERROR", err);
    return jsonFail("Something went wrong", 500);
  }
}
