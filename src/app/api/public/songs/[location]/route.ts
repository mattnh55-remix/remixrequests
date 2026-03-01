import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRulesForLocation } from "@/lib/rules";

export async function GET(req: Request, { params }: { params: { location: string } }) {
  const { loc } = await getRulesForLocation(params.location);
  const url = new URL(req.url);
  const search = (url.searchParams.get("search") || "").trim();
  const tag = (url.searchParams.get("tag") || "").trim();
  const page = Math.max(1, Number(url.searchParams.get("page") || "1"));
  const take = 24;
  const skip = (page - 1) * take;

  const where: any = { locationId: loc.id };
  if (search) {
    where.OR = [
      { title: { contains: search, mode: "insensitive" } },
      { artist: { contains: search, mode: "insensitive" } }
    ];
  }
  if (tag) where.tags = { has: tag };

  const [items, total] = await Promise.all([
    prisma.song.findMany({ where, take, skip, orderBy: { title: "asc" } }),
    prisma.song.count({ where })
  ]);

  return NextResponse.json({ items, total, page, pages: Math.ceil(total / take) });
}
