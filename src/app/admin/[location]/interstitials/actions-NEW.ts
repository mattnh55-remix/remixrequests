"use server";

import { prisma } from "@/lib/prisma";

export async function saveInterstitialAsset(data: any) {
  if (data.id) {
    return prisma.interstitialAsset.update({
      where: { id: data.id },
      data,
    });
  }

  return prisma.interstitialAsset.create({
    data,
  });
}