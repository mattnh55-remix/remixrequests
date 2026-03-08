import { prisma } from "@/lib/db";
import { createSignedStorageUrl } from "@/lib/supabaseAdmin";

export async function getShoutoutSignedImageUrl(messageId: string, expiresIn = 60 * 30) {
  const msg = await prisma.screenMessage.findUnique({
    where: { id: messageId },
    select: {
      id: true,
      imagePreviewPath: true,
      imageOriginalPath: true,
    },
  });

  if (!msg) return null;

  const path = msg.imagePreviewPath || msg.imageOriginalPath;
  if (!path) return null;

  try {
    return await createSignedStorageUrl(path, expiresIn);
  } catch {
    return null;
  }
}

export async function attachSignedImageUrlsToMessages<
  T extends { id: string; imagePreviewPath?: string | null; imageOriginalPath?: string | null }
>(items: T[], expiresIn = 60 * 30) {
  const out = await Promise.all(
    items.map(async (item) => {
      const path = item.imagePreviewPath || item.imageOriginalPath || null;
      if (!path) return { ...item, signedImageUrl: null };

      try {
        const signedImageUrl = await createSignedStorageUrl(path, expiresIn);
        return { ...item, signedImageUrl };
      } catch {
        return { ...item, signedImageUrl: null };
      }
    })
  );

  return out;
}