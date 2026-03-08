
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req:Request){
  const { messageId } = await req.json();

  const msg = await prisma.screenMessage.update({
    where:{ id:messageId },
    data:{
      status:"APPROVED",
      approvedAt:new Date()
    }
  });

  return NextResponse.json({ok:true});
}
