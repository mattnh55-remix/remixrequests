
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req:Request){
  const { messageId, note } = await req.json();

  const msg = await prisma.screenMessage.findUnique({ where:{id:messageId}});
  if(!msg) return NextResponse.json({ok:false});

  await prisma.$transaction(async(tx)=>{

    await tx.screenMessage.update({
      where:{id:messageId},
      data:{
        status:"REJECTED",
        rejectedAt:new Date(),
        moderationNotes:note
      }
    });

    await tx.creditLedger.create({
      data:{
        locationId:msg.locationId,
        emailHash:msg.emailHash,
        delta:msg.creditsCost,
        reason:"SHOUT_REFUND_REJECTED"
      }
    });

  });

  return NextResponse.json({ok:true});
}
