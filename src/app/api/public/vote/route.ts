// src/app/api/public/vote/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRulesForLocation } from "@/lib/rules";
import {
  getCreditBalance,
  getEmailHashSpendableState,
  getOrCreateCurrentSession,
  secondsSinceLastAction,
} from "@/lib/validators";
import { hashEmail } from "@/lib/security";
import { bumpTop10VoteForRequest } from "@/lib/top10";

function jsonFail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request) {
  const body = await req.json();
  const locationSlug = String(body.location || "");
  const requestId = String(body.requestId || "");
  const vote = String(body.vote || "up");
  const email = String(body.email || "");

  if (!locationSlug || !requestId || !email) return jsonFail("Missing fields.", 400);

  const { loc, rules } = await getRulesForLocation(locationSlug);
  if (!rules.enableVoting) return jsonFail("Voting disabled.", 400);

  const session = await getOrCreateCurrentSession(loc.id, 4);
  const emailHash = hashEmail(email);

  const guestState = await getEmailHashSpendableState(loc.id, emailHash);
  if (!guestState?.identity?.smsVerifiedAt) {
    return jsonFail("Please verify your phone to continue.", 403);
  }
  if (!guestState.sessionActive || !guestState.sessionExpiresAt) {
    return jsonFail("Your 4-hour session has expired. Verify again to continue.", 403);
  }

  const sessionExpiresAt = guestState.sessionExpiresAt;

  const secs = await secondsSinceLastAction(loc.id, emailHash);
  if (secs < rules.minSecondsBetweenActions) {
    return jsonFail(`Please wait ${Math.ceil(rules.minSecondsBetweenActions - secs)}s.`, 400);
  }

  const val = vote === "down" ? -1 : 1;
  const cost = val === 1 ? rules.costUpvote : rules.costDownvote;

  const reqRow = await prisma.request.findFirst({
    where: { id: requestId, locationId: loc.id, sessionId: session.id, status: "APPROVED" },
  });
  if (!reqRow) return jsonFail("Request not found.", 404);

  try {
    await prisma.$transaction(
      async (tx) => {
        const countVotes = await tx.vote.count({ where: { sessionId: session.id, emailHash } });
        if (countVotes >= rules.maxVotesPerSession) {
          throw new Error("LIMIT:Vote limit reached.");
        }

        const balance = await getCreditBalance(loc.id, emailHash, new Date());
        if (balance < cost) {
          throw new Error(`NOCREDITS:${rules.msgNoCredits}`);
        }

        await tx.creditLedger.create({
          data: {
            locationId: loc.id,
            emailHash,
            delta: -cost,
            reason: val === 1 ? "UPVOTE" : "DOWNVOTE",
            expiresAt: sessionExpiresAt,
          },
        });
        await tx.vote.create({
          data: { requestId: reqRow.id, sessionId: session.id, emailHash, value: val },
        });
        await bumpTop10VoteForRequest(tx, { requestId: reqRow.id, value: val });
      },
      { isolationLevel: "Serializable" }
    );

    return NextResponse.json({ ok: true, sessionExpiresAt: sessionExpiresAt });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg.startsWith("LIMIT:")) return jsonFail(msg.slice("LIMIT:".length), 400);
    if (msg.startsWith("NOCREDITS:")) return jsonFail(msg.slice("NOCREDITS:".length), 400);
    return jsonFail("Could not submit vote.", 400);
  }
}
