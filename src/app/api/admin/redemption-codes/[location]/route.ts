import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRulesForLocation } from "@/lib/rules";
import { getOrCreateCurrentSession } from "@/lib/validators";
import { isAdminFromCookie } from "@/lib/adminAuth";

function jsonFail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(req: Request, { params }: { params: { location: string } }) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const { loc } = await getRulesForLocation(params.location);
  const session = await getOrCreateCurrentSession(loc.id, 4);

  const items = await prisma.redemptionCode.findMany({
    where: { locationId: loc.id, sessionId: session.id },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ ok: true, sessionId: session.id, items });
}

export async function POST(req: Request, { params }: { params: { location: string } }) {
  if (!isAdminFromCookie(req.headers.get("cookie"))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const code = (body?.code || "").toString().trim().toUpperCase();
  const points = Number(body?.points ?? 0);
  const maxUses = Number(body?.maxUses ?? 1);
  const source = (body?.source || "manual").toString();

  if (!code) return jsonFail("Missing code.");
  if (!Number.isFinite(points) || points <= 0) return jsonFail("Points must be > 0.");
  if (!Number.isFinite(maxUses) || maxUses < 1) return jsonFail("Max uses must be >= 1.");

  const { loc } = await getRulesForLocation(params.location);
  const session = await getOrCreateCurrentSession(loc.id, 4);

  // session-bound expiry
  const expiresAt = new Date(session.endsAt);

  try {
    const created = await prisma.redemptionCode.create({
      data: {
        locationId: loc.id,
        sessionId: session.id,
        code,
        points,
        maxUses,
        expiresAt,
        source
      }
    });
    return NextResponse.json({ ok: true, created });
  } catch {
    return jsonFail("Code already exists for this location.");
  }
}