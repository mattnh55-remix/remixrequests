"use server";

import { Prisma, InterstitialCategory, InterstitialScheduleMode, SessionProfile } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

function isInterstitialCategory(value: string): value is InterstitialCategory {
  return Object.values(InterstitialCategory).includes(value as InterstitialCategory);
}

function isInterstitialScheduleMode(value: string): value is InterstitialScheduleMode {
  return Object.values(InterstitialScheduleMode).includes(value as InterstitialScheduleMode);
}

function toSessionProfiles(value: FormDataEntryValue | null): SessionProfile[] {
  const raw = toStringArray(value);

  return raw.filter((profile): profile is SessionProfile =>
    Object.values(SessionProfile).includes(profile as SessionProfile),
  );
}

async function resolveLocationId(
  locationIdOrSlug: string,
): Promise<{ id: string; slug: string }> {
  const byId = await prisma.location.findUnique({
    where: { id: locationIdOrSlug },
    select: { id: true, slug: true },
  });

  if (byId) return byId;

  const bySlug = await prisma.location.findUnique({
    where: { slug: locationIdOrSlug },
    select: { id: true, slug: true },
  });

  if (bySlug) return bySlug;

  throw new Error(`Location not found for "${locationIdOrSlug}".`);
}

function buildInterstitialAdminPath(
  slug: string,
  params?: Record<string, string | number | boolean | null | undefined>,
) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params ?? {})) {
    if (value == null) continue;
    const text = String(value).trim();
    if (!text) continue;
    search.set(key, text);
  }

  const qs = search.toString();
  return qs ? `/admin/${slug}/interstitials?${qs}` : `/admin/${slug}/interstitials`;
}

function redirectToAdmin(
  slug: string,
  params?: Record<string, string | number | boolean | null | undefined>,
): never {
  redirect(buildInterstitialAdminPath(slug, params));
}

function isUniqueConstraintError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

export async function saveInterstitialAsset(formData: FormData) {
  const id = toStringValue(formData.get("id")) || undefined;
  const locationRaw = toStringValue(formData.get("locationId"));
  const name = toStringValue(formData.get("name"));
  const categoryRaw = toStringValue(formData.get("category"));
  const fileUrl = toStringValue(formData.get("fileUrl"));
  const previewGifUrlRaw = toStringValue(formData.get("previewGifUrl"));
  const iconLabelRaw = toStringValue(formData.get("iconLabel"));
  const notesRaw = toStringValue(formData.get("notes"));
  const durationSec = toNullableInt(formData.get("durationSec"));
  const active = toBool(formData.get("active"));
  const manualOnly = toBool(formData.get("manualOnly"));
  const priority = toInt(formData.get("priority"), 0);
  const randomWeight = toInt(formData.get("randomWeight"), 100);

  // Kept for transition-safe schema compatibility
  const scheduleModeRaw = toStringValue(formData.get("scheduleMode"), "NONE");
  const intervalMinutes = toNullableInt(formData.get("intervalMinutes"));

  const allowedProfiles = toSessionProfiles(formData.get("allowedProfiles"));
  const blockedProfiles = toSessionProfiles(formData.get("blockedProfiles"));

  if (!locationRaw) throw new Error("Missing locationId.");
  if (!name) throw new Error("Asset name is required.");
  if (!categoryRaw) throw new Error("Category is required.");
  if (!fileUrl) throw new Error("Local file name is required.");

  if (!isInterstitialCategory(categoryRaw)) {
    throw new Error(`Invalid category: ${categoryRaw}`);
  }

  if (!isInterstitialScheduleMode(scheduleModeRaw)) {
    throw new Error(`Invalid schedule mode: ${scheduleModeRaw}`);
  }

  const location = await resolveLocationId(locationRaw);

  const data = {
    locationId: location.id,
    name,
    category: categoryRaw as InterstitialCategory,
    fileUrl,
    previewGifUrl: previewGifUrlRaw || null,
    iconLabel: iconLabelRaw || null,
    notes: notesRaw || null,
    durationSec,
    active,
    manualOnly,
    priority,
    randomWeight,
    scheduleMode: scheduleModeRaw as InterstitialScheduleMode,
    intervalMinutes:
      scheduleModeRaw === "INTERVAL_MINUTES" ? intervalMinutes : null,
    allowedProfiles,
    blockedProfiles,
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

  revalidatePath(`/admin/${location.slug}/interstitials`);
  redirectToAdmin(location.slug, {
    assetStatus: "saved",
    assetMessage: id ? "Asset updated." : "Asset created.",
  });
}

export async function toggleInterstitialAsset(formData: FormData) {
  const id = toStringValue(formData.get("id"));
  const locationRaw = toStringValue(formData.get("locationId"));
  const nextActive = toStringValue(formData.get("nextActive")) === "true";

  if (!id || !locationRaw) {
    throw new Error("Missing required fields.");
  }

  const location = await resolveLocationId(locationRaw);

  await prisma.interstitialAsset.update({
    where: { id },
    data: { active: nextActive },
  });

  revalidatePath(`/admin/${location.slug}/interstitials`);
  redirectToAdmin(location.slug, {
    assetStatus: "saved",
    assetMessage: nextActive ? "Asset activated." : "Asset deactivated.",
  });
}

export async function deleteInterstitialAsset(formData: FormData) {
  const id = toStringValue(formData.get("id"));
  const locationRaw = toStringValue(formData.get("locationId"));

  if (!id || !locationRaw) {
    throw new Error("Missing required fields.");
  }

  const location = await resolveLocationId(locationRaw);

  await prisma.interstitialEvent.deleteMany({
    where: { assetId: id },
  });

  await prisma.interstitialAsset.delete({
    where: { id },
  });

  revalidatePath(`/admin/${location.slug}/interstitials`);
  redirectToAdmin(location.slug, {
    assetStatus: "saved",
    assetMessage: "Asset deleted.",
  });
}

export async function saveInterstitialSchedule(formData: FormData) {
  const id = toStringValue(formData.get("id")) || undefined;
  const locationRaw = toStringValue(formData.get("locationId"));
  const categoryRaw = toStringValue(formData.get("category"));
  const labelRaw = toStringValue(formData.get("label"));
  const promptTitleRaw = toStringValue(formData.get("promptTitle"));
  const promptBodyRaw = toStringValue(formData.get("promptBody"));
  const startMinute = toInt(formData.get("startMinute"), -1);
  const endMinute = toInt(formData.get("endMinute"), -1);
  const sortOrder = toInt(formData.get("sortOrder"), 0);
  const cooldownMinutes = toNullableInt(formData.get("cooldownMinutes"));
  const active = toBool(formData.get("active"));
  const required = toBool(formData.get("required"));

  if (!locationRaw) throw new Error("Missing locationId.");
  if (!categoryRaw) throw new Error("Category is required.");

  if (!isInterstitialCategory(categoryRaw)) {
    throw new Error(`Invalid category: ${categoryRaw}`);
  }

  if (startMinute < 0) {
    throw new Error("Start minute must be 0 or greater.");
  }

  if (endMinute < startMinute) {
    throw new Error("End minute must be greater than or equal to start minute.");
  }

  const location = await resolveLocationId(locationRaw);

  const data = {
    locationId: location.id,
    category: categoryRaw as InterstitialCategory,
    label: labelRaw || null,
    promptTitle: promptTitleRaw || null,
    promptBody: promptBodyRaw || null,
    startMinute,
    endMinute,
    sortOrder,
    cooldownMinutes,
    active,
    required,
  };

  try {
    if (id) {
      await prisma.interstitialSchedule.update({
        where: { id },
        data,
      });

      revalidatePath(`/admin/${location.slug}/interstitials`);
      redirectToAdmin(location.slug, {
        scheduleStatus: "saved",
        scheduleMessage: "Window updated.",
      });
    }

    await prisma.interstitialSchedule.create({
      data,
    });

    revalidatePath(`/admin/${location.slug}/interstitials`);
    redirectToAdmin(location.slug, {
      scheduleStatus: "saved",
      scheduleMessage: "Window created.",
    });
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      redirectToAdmin(location.slug, {
        scheduleStatus: "error",
        scheduleMessage:
          "A window already exists with this same category and minute range.",
        editSchedule: id ?? "",
      });
    }

    throw error;
  }
}

export async function toggleInterstitialSchedule(formData: FormData) {
  const id = toStringValue(formData.get("id"));
  const locationRaw = toStringValue(formData.get("locationId"));
  const nextActive = toStringValue(formData.get("nextActive")) === "true";

  if (!id || !locationRaw) {
    throw new Error("Missing required fields.");
  }

  const location = await resolveLocationId(locationRaw);

  await prisma.interstitialSchedule.update({
    where: { id },
    data: { active: nextActive },
  });

  revalidatePath(`/admin/${location.slug}/interstitials`);
  redirectToAdmin(location.slug, {
    scheduleStatus: "saved",
    scheduleMessage: nextActive ? "Window activated." : "Window deactivated.",
  });
}

export async function deleteInterstitialSchedule(formData: FormData) {
  const id = toStringValue(formData.get("id"));
  const locationRaw = toStringValue(formData.get("locationId"));

  if (!id || !locationRaw) {
    throw new Error("Missing required fields.");
  }

  const location = await resolveLocationId(locationRaw);

  await prisma.interstitialEvent.deleteMany({
    where: { scheduleId: id },
  });

  await prisma.interstitialSchedule.delete({
    where: { id },
  });

  revalidatePath(`/admin/${location.slug}/interstitials`);
  redirectToAdmin(location.slug, {
    scheduleStatus: "saved",
    scheduleMessage: "Window deleted.",
  });
}

export async function saveBoothNote(formData: FormData) {
  const locationRaw = toStringValue(formData.get("locationId"));
  const body = toStringValue(formData.get("body"));

  if (!locationRaw) {
    throw new Error("Missing locationId.");
  }

  const location = await resolveLocationId(locationRaw);

  await prisma.boothNote.upsert({
    where: { locationId: location.id },
    update: { body },
    create: {
      locationId: location.id,
      body,
    },
  });

  revalidatePath(`/admin/${location.slug}/interstitials`);
  redirectToAdmin(location.slug, {
    noteStatus: "saved",
    noteMessage: "Booth notes saved.",
  });
}