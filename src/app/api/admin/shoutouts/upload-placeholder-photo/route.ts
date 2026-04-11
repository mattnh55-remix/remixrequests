// src/app/api/admin/shoutouts/upload-placeholder-photo/route.ts

import { NextResponse } from "next/server";
import { isAdminFromCookie } from "@/lib/adminAuth";
import {
  ALLOWED_SHOUTOUT_IMAGE_MIME_TYPES,
  MAX_SHOUTOUT_IMAGE_BYTES,
  SHOUTOUT_IMAGE_BUCKET,
  normalizeShoutoutImageMime,
  sanitizeShoutoutUploadFilename,
  supabaseAdmin,
  createSignedStorageUrl,
} from "@/lib/supabaseAdmin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fail(message: string, status = 400) {
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

function buildPlaceholderOriginalPath(args: {
  locationSlug: string;
  placeholderId: string;
  filename: string;
}) {
  const cleanLocation = String(args.locationSlug || "default").trim().toLowerCase();
  const cleanPlaceholderId = String(args.placeholderId || "placeholder").trim().toLowerCase();

  return [
    "admin-placeholders",
    cleanLocation,
    cleanPlaceholderId,
    `${Date.now()}-${args.filename}`,
  ].join("/");
}

export async function POST(req: Request) {
  try {
    if (!isAdminFromCookie(req.headers.get("cookie") || "")) {
      return fail("Unauthorized", 401);
    }

    const form = await req.formData();

    const location = String(form.get("location") || "").trim();
    const placeholderId = String(form.get("placeholderId") || "").trim();
    const file = form.get("file");

    if (!location) {
      return fail("Missing location.");
    }

    if (!placeholderId) {
      return fail("Missing placeholder ID.");
    }

    if (!(file instanceof File)) {
      return fail("Missing image file.");
    }

    const mime = normalizeShoutoutImageMime({
      type: file.type,
      name: file.name,
    });

    if (!ALLOWED_SHOUTOUT_IMAGE_MIME_TYPES.has(mime)) {
      return fail("That image type isn’t supported.");
    }

    if (file.size > MAX_SHOUTOUT_IMAGE_BYTES) {
      return fail("That image is too large.");
    }

    const originalFilename = sanitizeShoutoutUploadFilename(
      file.name || `upload.${getFileExtensionFromMime(mime)}`,
      mime
    );

    const originalPath = buildPlaceholderOriginalPath({
      locationSlug: location,
      placeholderId,
      filename: originalFilename,
    });

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const uploadResult = await supabaseAdmin.storage
      .from(SHOUTOUT_IMAGE_BUCKET)
      .upload(originalPath, fileBuffer, {
        contentType: mime,
        upsert: false,
      });

    if (uploadResult.error) {
      return fail(uploadResult.error.message || "Image upload failed.", 500);
    }

    let signedImageUrl: string | null = null;

    try {
      signedImageUrl = await createSignedStorageUrl(originalPath, 60 * 60 * 24 * 7);
    } catch {
      signedImageUrl = null;
    }

    return NextResponse.json({
      ok: true,
      imagePath: originalPath,
      signedImageUrl,
    });
  } catch (err) {
    console.error("ADMIN_PLACEHOLDER_UPLOAD_ERROR", err);
    return fail("Something went wrong.", 500);
  }
}