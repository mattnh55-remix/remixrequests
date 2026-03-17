import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("Missing SUPABASE_URL");
}

if (!supabaseServiceRoleKey) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

export const SHOUTOUT_IMAGE_BUCKET = "shoutout-images";

export const ALLOWED_SHOUTOUT_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/heic",
  "image/heif",
  "image/heic-sequence",
  "image/heif-sequence",
]);

export const MAX_SHOUTOUT_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

export function sanitizeFilename(filename: string) {
  const trimmed = String(filename || "upload").trim();
  return trimmed
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 120) || "upload";
}

export function normalizeShoutoutImageMime(input: { type?: string | null; name?: string | null }) {
  const rawMime = String(input?.type || "").toLowerCase().trim();
  const lowerName = String(input?.name || "").toLowerCase().trim();

  if (rawMime === "image/jpeg" || rawMime === "image/jpg") return "image/jpeg";
  if (rawMime === "image/png") return "image/png";

  if (rawMime === "image/heic" || rawMime === "image/heic-sequence") {
    return "image/heic";
  }

  if (rawMime === "image/heif" || rawMime === "image/heif-sequence") {
    return "image/heif";
  }

  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return "image/jpeg";
  if (lowerName.endsWith(".png")) return "image/png";
  if (lowerName.endsWith(".heic")) return "image/heic";
  if (lowerName.endsWith(".heif")) return "image/heif";

  return rawMime;
}

export function sanitizeShoutoutUploadFilename(filename: string, fallbackMime?: string) {
  const safeBase = sanitizeFilename(filename || "upload");
  const hasExtension = /\.[a-z0-9]+$/i.test(safeBase);

  if (hasExtension) return safeBase;

  const mime = String(fallbackMime || "").toLowerCase().trim();

  if (mime === "image/jpeg" || mime === "image/jpg") return `${safeBase}.jpg`;
  if (mime === "image/png") return `${safeBase}.png`;
  if (mime === "image/heic" || mime === "image/heic-sequence") return `${safeBase}.heic`;
  if (mime === "image/heif" || mime === "image/heif-sequence") return `${safeBase}.heif`;

  return `${safeBase}.bin`;
}

export function buildShoutoutOriginalPath(args: {
  locationSlug: string;
  sessionId: string;
  messageId: string;
  filename: string;
}) {
  const safe = sanitizeFilename(args.filename);
  return `${args.locationSlug}/${args.sessionId}/${args.messageId}/original/${safe}`;
}

export function buildShoutoutPreviewPath(args: {
  locationSlug: string;
  sessionId: string;
  messageId: string;
}) {
  return `${args.locationSlug}/${args.sessionId}/${args.messageId}/preview/display.jpg`;
}

export async function createSignedStorageUrl(path: string, expiresIn = 60 * 60) {
  const { data, error } = await supabaseAdmin.storage
    .from(SHOUTOUT_IMAGE_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}