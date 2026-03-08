
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req:Request,{params}:{params:{location:string}}){

  const loc = await prisma.location.findUnique({
    where:{ slug:params.location }
  });

  if(!loc) return NextResponse.json({items:[]});

  const msgs = await prisma.screenMessage.findMany({
    where:{
      locationId:loc.id,
      status:{ in:["APPROVED","ACTIVE"] }
    },
    orderBy:[
      { sortWeight:"desc" },
      { approvedAt:"asc" }
    ],
    take:20
  });

  return NextResponse.json({
    items:msgs.map(m=>({
      id:m.id,
      fromName:m.fromName,
      messageText:m.messageText,
      tier:m.tier,
      displayDurationSec:m.displayDurationSec
    }))
  });
}
