export function getAdminUserFromCookie(cookieHeader?: string | null) {
  if (!cookieHeader) return null;

  const match = cookieHeader.match(/(?:^|;\s*)rr_admin_user=([^;]+)/);
  if (!match) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

export function isAdminFromCookie(cookieHeader?: string | null) {
  return Boolean(getAdminUserFromCookie(cookieHeader));
}