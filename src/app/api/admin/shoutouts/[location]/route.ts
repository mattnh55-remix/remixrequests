
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req:Request,{params}:{params:{location:string}}){

  const loc = await prisma.location.findUnique({ where:{slug:params.location}});
  if(!loc) return NextResponse.json({});

  const pending = await prisma.screenMessage.findMany({
    where:{locationId:loc.id,status:"PENDING"},
    orderBy:{createdAt:"desc"}
  });

  const approved = await prisma.screenMessage.findMany({
    where:{locationId:loc.id,status:"APPROVED"},
    orderBy:{approvedAt:"desc"}
  });

  const rejected = await prisma.screenMessage.findMany({
    where:{locationId:loc.id,status:"REJECTED"},
    orderBy:{rejectedAt:"desc"}
  });

  return NextResponse.json({pending,approved,rejected});
}
