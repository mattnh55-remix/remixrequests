"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

function toNullableInt(value: FormDataEntryValue | null): number | null {
  if (value == null) return null;
  const str = String(value).trim();
  if (!str) return null;
  const num = Number(str);
  return Number.isFinite(num) ? num : null;
}

function toInt(value: FormDataEntryValue | null, fallback = 0): number {
  if (value == null) return fallback;
  const str = String(value).trim();
  if (!str) return fallback;
  const num = Number(str);
  return Number.isFinite(num) ? num : fallback;
}

function toBool(value: FormDataEntryValue | null): boolean {
  return value === "on" || value === "true";
}

function toStringValue(value: FormDataEntryValue | null, fallback = ""): string {
  if (value == null) return fallback;
  return String(value).trim();
}

function toStringArray(value: FormDataEntryValue | null): string[] {
  if (value == null) return [];
  return String(value)
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
}

export async function saveInterstitialAsset(formData: FormData) {
  const id = toStringValue(formData.get("id")) || undefined;
  const locationId = toStringValue(formData.get("locationId"));
  const name = toStringValue(formData.get("name"));
  const category = toStringValue(formData.get("category"));
  const fileUrl = toStringValue(formData.get("fileUrl"));
  const durationSec = toNullableInt(formData.get("durationSec"));
  const active = toBool(formData.get("active"));
  const priority = toInt(formData.get("priority"), 0);
  const randomWeight = toInt(formData.get("randomWeight"), 100);
  const scheduleMode = toStringValue(formData.get("scheduleMode"), "NONE");
  const intervalMinutes = toNullableInt(formData.get("intervalMinutes"));
  const allowedProfiles = toStringArray(formData.get("allowedProfiles"));
  const blockedProfiles = toStringArray(formData.get("blockedProfiles"));

  if (!locationId) throw new Error("Missing locationId.");
  if (!name) throw new Error("Name is required.");
  if (!category) throw new Error("Category is required.");
  if (!fileUrl) throw new Error("File URL is required.");

  const data = {
    locationId,
    name,
    category: category as any,
    fileUrl,
    durationSec,
    active,
    priority,
    randomWeight,
    scheduleMode: scheduleMode as any,
    intervalMinutes,
    allowedProfiles: allowedProfiles as any,
    blockedProfiles: blockedProfiles as any,
  };

  if (id) {
    await prisma.interstitialAsset.update({
      where: { id },
      data,
    });
  } else {
    await prisma.interstitialAsset.create({
      data,
    });
  }

  revalidatePath(`/admin/${locationId}/interstitials`);
}

export async function toggleInterstitialAsset(formData: FormData) {
  const id = toStringValue(formData.get("id"));
  const locationId = toStringValue(formData.get("locationId"));
  const nextActive = toStringValue(formData.get("nextActive")) === "true";

  if (!id || !locationId) {
    throw new Error("Missing required fields.");
  }

  await prisma.interstitialAsset.update({
    where: { id },
    data: {
      active: nextActive,
    },
  });

  revalidatePath(`/admin/${locationId}/interstitials`);
}

export async function deleteInterstitialAsset(formData: FormData) {
  const id = toStringValue(formData.get("id"));
  const locationId = toStringValue(formData.get("locationId"));

  if (!id || !locationId) {
    throw new Error("Missing required fields.");
  }

  await prisma.interstitialAsset.delete({
    where: { id },
  });

  revalidatePath(`/admin/${locationId}/interstitials`);
}