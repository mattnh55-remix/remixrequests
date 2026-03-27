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

function revalidate(locationId: string) {
  revalidatePath(`/admin/${locationId}/interstitials`);
}

export async function saveInterstitialAsset(formData: FormData) {
  const id = toStringValue(formData.get("id")) || undefined;
  const locationId = toStringValue(formData.get("locationId"));
  const name = toStringValue(formData.get("name"));
  const category = toStringValue(formData.get("category"));
  const fileUrl = toStringValue(formData.get("fileUrl"));
  const previewGifUrl = toStringValue(formData.get("previewGifUrl")) || null;
  const iconLabel = toStringValue(formData.get("iconLabel")) || null;
  const durationSec = toNullableInt(formData.get("durationSec"));
  const notes = toStringValue(formData.get("notes")) || null;
  const active = toBool(formData.get("active"));
  const manualOnly = toBool(formData.get("manualOnly"));
  const priority = toInt(formData.get("priority"), 0);
  const randomWeight = toInt(formData.get("randomWeight"), 100);
  const allowedProfiles = toStringArray(formData.get("allowedProfiles"));
  const blockedProfiles = toStringArray(formData.get("blockedProfiles"));

  if (!locationId) throw new Error("Missing locationId.");
  if (!name) throw new Error("Name is required.");
  if (!category) throw new Error("Category is required.");
  if (!fileUrl) throw new Error("Local file name is required.");

  const data = {
    locationId,
    name,
    category: category as any,
    fileUrl,
    previewGifUrl,
    iconLabel,
    durationSec,
    notes,
    active,
    manualOnly,
    priority,
    randomWeight,
    allowedProfiles: allowedProfiles as any,
    blockedProfiles: blockedProfiles as any,
  };

  if (id) {
    await prisma.interstitialAsset.update({
      where: { id },
      data,
    });
  } else {
    await prisma.interstitialAsset.create({ data });
  }

  revalidate(locationId);
}

export async function toggleInterstitialAsset(formData: FormData) {
  const id = toStringValue(formData.get("id"));
  const locationId = toStringValue(formData.get("locationId"));
  const nextActive = toStringValue(formData.get("nextActive")) === "true";

  if (!id || !locationId) throw new Error("Missing required fields.");

  await prisma.interstitialAsset.update({
    where: { id },
    data: { active: nextActive },
  });

  revalidate(locationId);
}

export async function deleteInterstitialAsset(formData: FormData) {
  const id = toStringValue(formData.get("id"));
  const locationId = toStringValue(formData.get("locationId"));

  if (!id || !locationId) throw new Error("Missing required fields.");

  await prisma.interstitialAsset.delete({ where: { id } });
  revalidate(locationId);
}

export async function saveInterstitialSchedule(formData: FormData) {
  const id = toStringValue(formData.get("id")) || undefined;
  const locationId = toStringValue(formData.get("locationId"));
  const category = toStringValue(formData.get("category"));
  const label = toStringValue(formData.get("label")) || null;
  const promptTitle = toStringValue(formData.get("promptTitle")) || null;
  const promptBody = toStringValue(formData.get("promptBody")) || null;
  const startMinute = toInt(formData.get("startMinute"), 0);
  const endMinute = toInt(formData.get("endMinute"), 0);
  const sortOrder = toInt(formData.get("sortOrder"), 0);
  const cooldownMinutes = toNullableInt(formData.get("cooldownMinutes"));
  const active = toBool(formData.get("active"));
  const required = toBool(formData.get("required"));

  if (!locationId) throw new Error("Missing locationId.");
  if (!category) throw new Error("Category is required.");
  if (endMinute < startMinute) throw new Error("End minute must be greater than or equal to start minute.");

  const data = {
    locationId,
    category: category as any,
    label,
    promptTitle,
    promptBody,
    startMinute,
    endMinute,
    sortOrder,
    cooldownMinutes,
    active,
    required,
  };

  if (id) {
    await prisma.interstitialSchedule.update({
      where: { id },
      data,
    });
  } else {
    await prisma.interstitialSchedule.create({ data });
  }

  revalidate(locationId);
}

export async function toggleInterstitialSchedule(formData: FormData) {
  const id = toStringValue(formData.get("id"));
  const locationId = toStringValue(formData.get("locationId"));
  const nextActive = toStringValue(formData.get("nextActive")) === "true";

  if (!id || !locationId) throw new Error("Missing required fields.");

  await prisma.interstitialSchedule.update({
    where: { id },
    data: { active: nextActive },
  });

  revalidate(locationId);
}

export async function deleteInterstitialSchedule(formData: FormData) {
  const id = toStringValue(formData.get("id"));
  const locationId = toStringValue(formData.get("locationId"));

  if (!id || !locationId) throw new Error("Missing required fields.");

  await prisma.interstitialSchedule.delete({ where: { id } });
  revalidate(locationId);
}

export async function saveBoothNote(formData: FormData) {
  const locationId = toStringValue(formData.get("locationId"));
  const body = toStringValue(formData.get("body"));

  if (!locationId) throw new Error("Missing locationId.");

  await prisma.boothNote.upsert({
    where: { locationId },
    create: { locationId, body },
    update: { body },
  });

  revalidate(locationId);
}

export async function logInterstitialPlayback(formData: FormData) {
  const locationId = toStringValue(formData.get("locationId"));
  const sessionId = toStringValue(formData.get("sessionId")) || null;
  const assetId = toStringValue(formData.get("assetId")) || null;
  const scheduleId = toStringValue(formData.get("scheduleId")) || null;
  const category = toStringValue(formData.get("category"));
  const status = toStringValue(formData.get("status"), "PLAYED");
  const promptMinute = toNullableInt(formData.get("promptMinute"));
  const operatorNote = toStringValue(formData.get("operatorNote")) || null;

  if (!locationId || !category) throw new Error("Missing required fields.");

  await prisma.interstitialEvent.create({
    data: {
      locationId,
      sessionId,
      assetId,
      scheduleId,
      category: category as any,
      status: status as any,
      promptMinute,
      plannedAt: new Date(),
      playedAt: status === "PLAYED" ? new Date() : null,
      skippedAt: status === "SKIPPED" ? new Date() : null,
      canceledAt: status === "CANCELED" ? new Date() : null,
      operatorNote,
    },
  });

  revalidate(locationId);
}
