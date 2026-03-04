import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRulesForLocation } from "@/lib/rules";
import { isAdminFromCookie } from "@/lib/adminAuth";

function jsonFail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

export async function GET(req: Request, { params }: { params: { location: string } }) {
  if (!isAdminFromCookie(req.headers.get("cookie") || "")) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const { loc } = await getRulesForLocation(params.location);

  const items = await prisma.redemptionCode.findMany({
    where: { locationId: loc.id },
    orderBy: { createdAt: "desc" }
  });

  return NextResponse.json({ ok: true, items });
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

  try {
    const created = await prisma.redemptionCode.create({
      data: {
        locationId: loc.id,
        code,
        points,
        maxUses,
expiresAt: null,
redeemWindowMinutes: 150,
        source
      }
    });
    return NextResponse.json({ ok: true, created });
  } catch {
    return jsonFail("Code already exists for this location.");
  }
}