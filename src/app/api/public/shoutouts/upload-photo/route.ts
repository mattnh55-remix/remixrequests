import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hashEmail } from "@/lib/security";
import { getOrCreateCurrentSession } from "@/lib/validators";
import { getMessageRules } from "@/lib/messageRules";
import { moderateShoutoutText } from "@/lib/shoutoutModeration";
import {
  getLegacyProductAlias,
  getShoutoutProduct,
  type ShoutoutProductKey,
} from "@/lib/shoutoutProducts";
import {
  ALLOWED_SHOUTOUT_IMAGE_MIME_TYPES,
  MAX_SHOUTOUT_IMAGE_BYTES,
  SHOUTOUT_IMAGE_BUCKET,
  buildShoutoutOriginalPath,
  buildShoutoutPreviewPath,
  normalizeShoutoutImageMime,
  sanitizeShoutoutUploadFilename,
  supabaseAdmin,
} from "@/lib/supabaseAdmin";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jsonFail(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function getFileExtensionFromMime(mime: string) {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/heic":
      return "heic";
    case "image/heif":
      return "heif";
    default:
      return "bin";
  }
}

function normalizeUploadedImageMime(file: File) {
  const rawMime = String(file.type || "").toLowerCase().trim();
  const lowerName = String(file.name || "").toLowerCase().trim();

  if (rawMime === "image/jpeg" || rawMime === "image/jpg") return "image/jpeg";
  if (rawMime === "image/png") return "image/png";
  if (
    rawMime === "image/heic" ||
    rawMime === "image/heic-sequence"
  ) {
    return "image/heic";
  }
  if (
    rawMime === "image/heif" ||
    rawMime === "image/heif-sequence"
  ) {
    return "image/heif";
  }

  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return "image/jpeg";
  if (lowerName.endsWith(".png")) return "image/png";
  if (lowerName.endsWith(".heic")) return "image/heic";
  if (lowerName.endsWith(".heif")) return "image/heif";

  return rawMime;
}

function hasTooLongRun(input: string, maxRun = 20) {
  let run = 0;

  for (const ch of String(input || "")) {
    if (/\s/.test(ch)) {
      run = 0;
      continue;
    }

    run += 1;
    if (run > maxRun) return true;
  }

  return false;
}

function hasTooManyRepeatedChars(input: string, maxRepeat = 6) {
  let last = "";
  let run = 0;

  for (const ch of Array.from(String(input || ""))) {
    if (ch === last) {
      run += 1;
      if (run > maxRepeat) return true;
    } else {
      last = ch;
      run = 1;
    }
  }

  return false;
}

function hasTooManyEmoji(input: string, maxEmoji = 10) {
  const matches =
    String(input || "").match(
      /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu
    ) || [];

  return matches.length > maxEmoji;
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const location = String(form.get("location") || "").trim();
    const identityId = String(form.get("identityId") || "").trim() || null;
    const email = String(form.get("email") || "").trim();
    const cleanFrom = String(form.get("fromName") || "").replace(/\s+/g, " ").trim();
    const cleanBody = String(form.get("messageText") || "").replace(/\s+/g, " ").trim();
    const productInput = String(form.get("productKey") || form.get("tier") || "").trim();
    const usageRightsAcceptedRaw = String(form.get("usageRightsAccepted") || "").trim();
    const usageRightsAccepted =
      usageRightsAcceptedRaw === "true" || usageRightsAcceptedRaw === "1";

    const file = form.get("file");

    if (!location || !email || !cleanFrom || !cleanBody || !productInput) {
      return jsonFail("Missing required fields.");
    }

    if (!(file instanceof File)) {
      return jsonFail("Missing image file.");
    }

    const selectedKey = getLegacyProductAlias(productInput);
    if (!selectedKey) {
      return jsonFail("Invalid shout-out selection.");
    }

    const product = getShoutoutProduct(selectedKey as ShoutoutProductKey);
    if (!product) {
      return jsonFail("Unknown shout-out product.");
    }

    if (!product.hasImage) {
      return jsonFail("That shout-out type does not accept a photo.");
    }

    if (!usageRightsAccepted) {
      return jsonFail("Please confirm you have the right to upload this photo.");
    }

    const { loc, rules } = await getMessageRules(location);

    if (!rules.enabled) {
      return jsonFail("Shout-outs are currently disabled.");
    }

    const session = await getOrCreateCurrentSession(loc.id, 4);
    const emailHash = hashEmail(email);

    if (cleanFrom.length > Number(rules.maxFromNameChars || 24)) {
      return jsonFail(
        `From name must be ${Number(rules.maxFromNameChars || 24)} characters or less.`
      );
    }

    if (cleanBody.length > Number(rules.maxMessageChars || 80)) {
      return jsonFail(
        `Message must be ${Number(rules.maxMessageChars || 80)} characters or less.`
      );
    }

    if (hasTooLongRun(cleanFrom, 18)) {
      return jsonFail("Please shorten the name or add spaces.");
    }

    if (hasTooLongRun(cleanBody, 20)) {
      return jsonFail("Please add spaces or shorten your message.");
    }

    if (hasTooManyRepeatedChars(cleanFrom, 6)) {
      return jsonFail("Please remove repeated characters from the name.");
    }

    if (hasTooManyRepeatedChars(cleanBody, 6)) {
      return jsonFail("Please remove repeated characters from the message.");
    }

    if (hasTooManyEmoji(cleanBody, 10)) {
      return jsonFail("Please use fewer emoji.");
    }

    const textMod = moderateShoutoutText(cleanFrom, cleanBody);
    if (textMod.result === "BLOCK") {
      await prisma.screenMessage.create({
        data: {
          locationId: loc.id,
          sessionId: session.id,
          identityId,
          emailHash,
          fromName: cleanFrom,
          messageText: cleanBody,
          tier: product.key,
          creditsCost: 0,
          status: "BLOCKED_TEXT",
          displayDurationSec: 0,
          sortWeight: product.weight,
          autoTextModerationResult: "BLOCK",
          autoTextModerationReason: textMod.reason,
          autoModeratedAt: new Date(),
          usageRightsAccepted,
          usageRightsAcceptedAt: new Date(),
        },
      });

      return jsonFail(rules.filterBlockMessage || "This message can’t be submitted as written.");
    }

    const pendingCount = await prisma.screenMessage.count({
      where: {
        locationId: loc.id,
        sessionId: session.id,
        emailHash,
        status: {
          in: ["PENDING", "APPROVED", "ACTIVE", "PENDING_IMAGE_SCAN"],
        },
      },
    });

    if (pendingCount >= Number(rules.maxPendingPerIdentity || 3)) {
      return jsonFail("You already have the maximum number of active shout-outs for this session.");
    }

const mime = normalizeShoutoutImageMime({
  type: file.type,
  name: file.name,
});

if (!ALLOWED_SHOUTOUT_IMAGE_MIME_TYPES.has(mime)) {
  return jsonFail("That image type isn’t supported.");
}

    if (file.size > MAX_SHOUTOUT_IMAGE_BYTES) {
      return jsonFail("That image is too large.");
    }

    const balanceAgg = await prisma.creditLedger.aggregate({
      _sum: { delta: true },
      where: {
        locationId: loc.id,
        emailHash,
      },
    });

    const balance = balanceAgg._sum.delta || 0;
    if (balance < product.creditsCost) {
      return jsonFail("Not enough credits.");
    }

    const provisional = await prisma.$transaction(
      async (tx) => {
        const activeSession = await tx.session.findFirst({
          where: {
            locationId: loc.id,
            endsAt: { gt: new Date() },
          },
          select: { endsAt: true },
          orderBy: { createdAt: "desc" },
        });

        await tx.creditLedger.create({
          data: {
            locationId: loc.id,
            emailHash,
            delta: -product.creditsCost,
            reason: `SHOUT_${product.key}`,
            expiresAt: activeSession?.endsAt ?? null,
          },
        });

        return tx.screenMessage.create({
          data: {
            locationId: loc.id,
            sessionId: session.id,
            identityId,
            emailHash,
            fromName: cleanFrom,
            messageText: cleanBody,
            tier: product.key,
            creditsCost: product.creditsCost,
            status: "PENDING",
            displayDurationSec: product.displayDurationSec,
            sortWeight: product.weight,
            autoTextModerationResult: "ALLOW",
            autoModeratedAt: new Date(),
            imageModerationStatus: "PENDING",
            imageOriginalMime: mime,
            imageSizeBytes: file.size,
            imageUploadedAt: new Date(),
            usageRightsAccepted,
            usageRightsAcceptedAt: new Date(),
          },
          select: {
            id: true,
          },
        });
      },
      { isolationLevel: "Serializable" }
    );

const originalFilename = sanitizeShoutoutUploadFilename(
  file.name || `upload.${getFileExtensionFromMime(mime)}`,
  mime
);
    const originalPath = buildShoutoutOriginalPath({
      locationSlug: location,
      sessionId: session.id,
      messageId: provisional.id,
      filename: originalFilename,
    });

    const previewPath = buildShoutoutPreviewPath({
      locationSlug: location,
      sessionId: session.id,
      messageId: provisional.id,
    });

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const originalUpload = await supabaseAdmin.storage
      .from(SHOUTOUT_IMAGE_BUCKET)
      .upload(originalPath, fileBuffer, {
        contentType: mime,
        upsert: false,
      });

    if (originalUpload.error) {
      await prisma.$transaction(async (tx) => {
        const activeSession = await tx.session.findFirst({
          where: {
            locationId: loc.id,
            endsAt: { gt: new Date() },
          },
          select: { endsAt: true },
          orderBy: { createdAt: "desc" },
        });

        await tx.creditLedger.create({
          data: {
            locationId: loc.id,
            emailHash,
            delta: product.creditsCost,
            reason: "SHOUT_REFUND_UPLOAD_FAILED",
            expiresAt: activeSession?.endsAt ?? null,
          },
        });

        await tx.screenMessage.update({
          where: { id: provisional.id },
          data: {
            status: "BLOCKED_IMAGE",
            imageModerationStatus: "ERROR",
            imageModerationReason: originalUpload.error.message,
          },
        });
      });

      return jsonFail("Image upload failed. Your credits were returned.", 500);
    }

    await prisma.screenMessage.update({
      where: { id: provisional.id },
      data: {
        imageOriginalPath: originalPath,
        imagePreviewPath: previewPath,
        imageModerationStatus: "PENDING",
      },
    });

    const updatedBalanceAgg = await prisma.creditLedger.aggregate({
      _sum: { delta: true },
      where: {
        locationId: loc.id,
        emailHash,
      },
    });

    return NextResponse.json({
      ok: true,
      messageId: provisional.id,
      balance: Math.max(updatedBalanceAgg._sum.delta || 0, 0),
      status: "PENDING",
      imageOriginalPath: originalPath,
      imagePreviewPath: previewPath,
      note: "✅ Photo shout-out submitted for approval!",
    });
  } catch (err) {
    console.error("SHOUTOUT_UPLOAD_PHOTO_ERROR", err);
    return jsonFail("Something went wrong.", 500);
  }
}
