import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getMessageRules } from "@/lib/messageRules";
import { moderateShoutoutText } from "@/lib/shoutoutModeration";
import { getOrCreateCurrentSession } from "@/lib/validators";
import { hashEmail } from "@/lib/security";

function jsonFail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      location,
      identityId,
      email,
      fromName,
      messageText,
      tier
    } = body;

    if (!location || !email || !fromName || !messageText || !tier) {
      return jsonFail("Missing required fields");
    }

    const { loc, rules } = await getMessageRules(location);

    if (!rules.enabled) {
      return jsonFail("Shout-outs are currently disabled");
    }

    const session = await getOrCreateCurrentSession(loc.id, 4);

    const emailHash = hashEmail(email);

    // -------------------------------
    // text moderation BEFORE charging
    // -------------------------------
    const mod = moderateShoutoutText(fromName, messageText);

    if (mod.result === "BLOCK") {
      await prisma.screenMessage.create({
        data: {
          locationId: loc.id,
          sessionId: session.id,
          identityId,
          emailHash,
          fromName,
          messageText,
          tier,
          creditsCost: 0,
          status: "BLOCKED_TEXT",
          displayDurationSec: 0,
          autoTextModerationResult: "BLOCK",
          autoTextModerationReason: mod.reason,
          autoModeratedAt: new Date()
        }
      });

      return jsonFail(rules.filterBlockMessage);
    }

    // -------------------------------
    // determine tier cost
    // -------------------------------
    const cost =
      tier === "FEATURED"
        ? rules.costFeatured
        : rules.costBasic;

    // -------------------------------
    // calculate current balance
    // -------------------------------
    const balanceAgg = await prisma.creditLedger.aggregate({
      _sum: { delta: true },
      where: {
        locationId: loc.id,
        emailHash
      }
    });

    const balance = balanceAgg._sum.delta || 0;

    if (balance < cost) {
      return jsonFail("Not enough credits");
    }

    // -------------------------------
    // transaction: deduct + create
    // -------------------------------
    const result = await prisma.$transaction(
      async (tx) => {
        await tx.creditLedger.create({
          data: {
            locationId: loc.id,
            emailHash,
            delta: -cost,
            reason:
              tier === "FEATURED"
                ? "SHOUT_FEATURED"
                : "SHOUT_BASIC"
          }
        });

        const msg = await tx.screenMessage.create({
          data: {
            locationId: loc.id,
            sessionId: session.id,
            identityId,
            emailHash,
            fromName,
            messageText,
            tier,
            creditsCost: cost,
            status: "PENDING",
            displayDurationSec:
              tier === "FEATURED"
                ? rules.displayDurationFeaturedSec
                : rules.displayDurationBasicSec,
            autoTextModerationResult: "ALLOW",
            autoModeratedAt: new Date()
          }
        });

        return msg;
      },
      { isolationLevel: "Serializable" }
    );

    // -------------------------------
    // return updated balance
    // -------------------------------
    const updatedBalanceAgg = await prisma.creditLedger.aggregate({
      _sum: { delta: true },
      where: {
        locationId: loc.id,
        emailHash
      }
    });

    const updatedBalance = updatedBalanceAgg._sum.delta || 0;

    return NextResponse.json({
      ok: true,
      messageId: result.id,
      balance: Math.max(updatedBalance, 0)
    });

  } catch (err) {
    console.error("SHOUTOUT_SUBMIT_ERROR", err);
    return jsonFail("Something went wrong", 500);
  }
}