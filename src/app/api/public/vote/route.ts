import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession, getCreditBalance, secondsSinceLastAction } from "@/lib/validators";
import { hashEmail } from "@/lib/security";

export async function POST(req: Request) {
  const body = await req.json();
  const locationSlug = String(body.location || "");
  const requestId = String(body.requestId || "");
  const vote = String(body.vote || "up"); // up | down
  const email = String(body.email || "");

  if (!locationSlug || !requestId || !email) {
    return NextResponse.json({ ok: false, error: "Missing fields." }, { status: 400 });
  }

  const { loc, rules } = await getRulesForLocation(locationSlug);
  if (!rules.enableVoting) return NextResponse.json({ ok: false, error: "Voting disabled." }, { status: 400 });

  const session = await getOrCreateCurrentSession(loc.id, 4);
  const emailHash = hashEmail(email);

  const secs = await secondsSinceLastAction(loc.id, emailHash);
  if (secs < rules.minSecondsBetweenActions) {
    return NextResponse.json({ ok: false, error: `Please wait ${Math.ceil(rules.minSecondsBetweenActions - secs)}s.` }, { status: 400 });
  }

  const val = vote === "down" ? -1 : 1;
  const cost = val === 1 ? rules.costUpvote : rules.costDownvote;

  const countVotes = await prisma.vote.count({ where: { sessionId: session.id, emailHash } });
  if (countVotes >= rules.maxVotesPerSession) {
    return NextResponse.json({ ok: false, error: "Vote limit reached." }, { status: 400 });
  }

  const reqRow = await prisma.request.findFirst({
    where: { id: requestId, locationId: loc.id, sessionId: session.id, status: "APPROVED" }
  });
  if (!reqRow) return NextResponse.json({ ok: false, error: "Request not found." }, { status: 404 });

  const balance = await getCreditBalance(loc.id, emailHash);
  if (balance < cost) return NextResponse.json({ ok: false, error: rules.msgNoCredits }, { status: 400 });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.creditLedger.create({ data: { locationId: loc.id, emailHash, delta: -cost, reason: val === 1 ? "UPVOTE" : "DOWNVOTE" } });
      await tx.vote.create({ data: { requestId: reqRow.id, sessionId: session.id, emailHash, value: val } });
    });
  } catch {
    return NextResponse.json({ ok: false, error: "You already voted on this." }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
