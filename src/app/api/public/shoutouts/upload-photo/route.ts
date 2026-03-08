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
  createSignedStorageUrl,
  sanitizeFilename,
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

export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const location = String(form.get("location") || "").trim();
    const identityId = String(form.get("identityId") || "").trim() || null;
    const email = String(form.get("email") || "").trim();
    const fromName = String(form.get("fromName") || "").trim();
    const messageText = String(form.get("messageText") || "").trim();
    const productInput = String(form.get("productKey") || form.get("tier") || "").trim();
    const usageRightsAcceptedRaw = String(form.get("usageRightsAccepted") || "").trim();
    const usageRightsAccepted =
      usageRightsAcceptedRaw === "true" || usageRightsAcceptedRaw === "1";

    const file = form.get("file");

    if (!location || !email || !fromName || !messageText || !productInput) {
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

    if (fromName.length > Number(rules.maxFromNameChars || 24)) {
      return jsonFail(
        `From name must be ${Number(rules.maxFromNameChars || 24)} characters or less.`
      );
    }

    if (messageText.length > Number(rules.maxMessageChars || 80)) {
      return jsonFail(
        `Message must be ${Number(rules.maxMessageChars || 80)} characters or less.`
      );
    }

    const textMod = moderateShoutoutText(fromName, messageText);
    if (textMod.result === "BLOCK") {
      await prisma.screenMessage.create({
        data: {
          locationId: loc.id,
          sessionId: session.id,
          identityId,
          emailHash,
          fromName,
          messageText,
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

    const mime = file.type || "";
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
        await tx.creditLedger.create({
          data: {
            locationId: loc.id,
            emailHash,
            delta: -product.creditsCost,
            reason: `SHOUT_${product.key}`,
          },
        });

        return tx.screenMessage.create({
          data: {
            locationId: loc.id,
            sessionId: session.id,
            identityId,
            emailHash,
            fromName,
            messageText,
            tier: product.key,
            creditsCost: product.creditsCost,
            status: "PENDING_IMAGE_SCAN",
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

    const originalFilename =
      sanitizeFilename(file.name || `upload.${getFileExtensionFromMime(mime)}`);
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
        await tx.creditLedger.create({
          data: {
            locationId: loc.id,
            emailHash,
            delta: product.creditsCost,
            reason: "SHOUT_REFUND_UPLOAD_FAILED",
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

    // V1 behavior:
    // - store the original now
    // - preview path reserved for later conversion pipeline
    // - keep photo products disabled until moderation/conversion is finished
    await prisma.screenMessage.update({
      where: { id: provisional.id },
      data: {
        imageOriginalPath: originalPath,
        imagePreviewPath: previewPath,
        // Placeholder moderation state until image moderation is implemented:
        imageModerationStatus: "PENDING",
      },
    });

    let signedOriginalUrl: string | null = null;
    try {
      signedOriginalUrl = await createSignedStorageUrl(originalPath, 60 * 30);
    } catch {
      signedOriginalUrl = null;
    }

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
      status: "PENDING_IMAGE_SCAN",
      imageOriginalPath: originalPath,
      imagePreviewPath: previewPath,
      previewUrl: signedOriginalUrl,
      note: "Photo uploaded. This shout-out will remain disabled until image moderation is in place.",
    });
  } catch (err) {
    console.error("SHOUTOUT_UPLOAD_PHOTO_ERROR", err);
    return jsonFail("Something went wrong.", 500);
  }
}