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
  "image/png",
  "image/heic",
  "image/heif",
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