// src/app/api/public/vote/route.ts

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession, secondsSinceLastAction } from "@/lib/validators";
import { hashEmail } from "@/lib/security";

function jsonFail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function POST(req: Request) {
  const body = await req.json();
  const locationSlug = String(body.location || "");
  const requestId = String(body.requestId || "");
  const vote = String(body.vote || "up"); // up | down
  const email = String(body.email || "");

  if (!locationSlug || !requestId || !email) return jsonFail("Missing fields.", 400);

  const { loc, rules } = await getRulesForLocation(locationSlug);
  if (!rules.enableVoting) return jsonFail("Voting disabled.", 400);

  const session = await getOrCreateCurrentSession(loc.id, 4);
  const emailHash = hashEmail(email);

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
        // enforce per-session vote limit INSIDE txn
        const countVotes = await tx.vote.count({ where: { sessionId: session.id, emailHash } });
        if (countVotes >= rules.maxVotesPerSession) {
          throw new Error("LIMIT:Vote limit reached.");
        }

        // atomic balance check INSIDE txn
        const now = new Date();
        const agg = await tx.creditLedger.aggregate({
          _sum: { delta: true },
          where: {
            locationId: loc.id,
            emailHash,
            OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
          },
        });
        const balance = agg._sum.delta ?? 0;
        if (balance < cost) {
          throw new Error(`NOCREDITS:${rules.msgNoCredits}`);
        }

        // charge + vote in same txn; if vote unique constraint fails, whole txn rolls back (no charge)
        await tx.creditLedger.create({
          data: { locationId: loc.id, emailHash, delta: -cost, reason: val === 1 ? "UPVOTE" : "DOWNVOTE" },
        });
        await tx.vote.create({
          data: { requestId: reqRow.id, sessionId: session.id, emailHash, value: val },
        });
      },
      { isolationLevel: "Serializable" }
    );

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    const msg = String(e?.message || "");
    if (msg.startsWith("LIMIT:")) return jsonFail(msg.slice("LIMIT:".length), 400);
    if (msg.startsWith("NOCREDITS:")) return jsonFail(msg.slice("NOCREDITS:".length), 400);

    // Most common here is unique constraint = "already voted"
    return jsonFail("You already voted on this.", 400);
  }
}