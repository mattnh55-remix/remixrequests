
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getMessageRules } from "@/lib/messageRules";
import { moderateShoutoutText } from "@/lib/shoutoutModeration";
import { getOrCreateCurrentSession } from "@/lib/validators";

export async function POST(req: Request) {
  const body = await req.json();
  const { location, identityId, email, fromName, messageText, tier } = body;

  if (!location || !email || !fromName || !messageText || !tier) {
    return NextResponse.json({ ok:false, error:"Missing fields"}, {status:400});
  }

  const { loc, rules } = await getMessageRules(location);
  if (!rules.enabled) return NextResponse.json({ ok:false, error:"Shout-outs disabled"});

  const session = await getOrCreateCurrentSession(loc.id);

  const mod = moderateShoutoutText(fromName, messageText);

  if (mod.result === "BLOCK") {
    await prisma.screenMessage.create({
      data:{
        locationId:loc.id,
        sessionId:session.id,
        emailHash:email,
        fromName,
        messageText,
        tier,
        creditsCost:0,
        status:"BLOCKED_TEXT",
        displayDurationSec:0,
        autoTextModerationResult:"BLOCK",
        autoTextModerationReason:mod.reason
      }
    });

    return NextResponse.json({
      ok:false,
      error:rules.filterBlockMessage
    });
  }

  const cost = tier === "FEATURED" ? rules.costFeatured : rules.costBasic;

  const balanceAgg = await prisma.creditLedger.aggregate({
    _sum:{ delta:true },
    where:{ locationId:loc.id, emailHash:email }
  });

  const balance = balanceAgg._sum.delta || 0;
  if (balance < cost) {
    return NextResponse.json({ ok:false, error:"Not enough credits"});
  }

  const result = await prisma.$transaction(async(tx)=>{
    await tx.creditLedger.create({
      data:{
        locationId:loc.id,
        emailHash:email,
        delta:-cost,
        reason: tier==="FEATURED" ? "SHOUT_FEATURED" : "SHOUT_BASIC"
      }
    });

    const msg = await tx.screenMessage.create({
      data:{
        locationId:loc.id,
        sessionId:session.id,
        identityId,
        emailHash:email,
        fromName,
        messageText,
        tier,
        creditsCost:cost,
        status:"PENDING",
        displayDurationSec: tier==="FEATURED" ? rules.displayDurationFeaturedSec : rules.displayDurationBasicSec,
        autoTextModerationResult:"ALLOW"
      }
    });

    return msg;
  });

  return NextResponse.json({ ok:true, messageId:result.id });
}
