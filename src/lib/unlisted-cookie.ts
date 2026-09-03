export const UNLISTED_COOKIE_NAME = "tb_unlisted";
export const UNLISTED_COOKIE_MAX_AGE = 7 * 24 * 60 * 60;
export const UNLISTED_COOKIE_MAX_ENTRIES = 20;

export function parseUnlistedCookie(raw?: string | null): Record<string, string> {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const map: Record<string, string> = {};
    for (const [beatId, token] of Object.entries(parsed)) {
      if (typeof token === "string" && token.length > 0) {
        map[beatId] = token;
      }
    }
    return map;
  } catch {
    return {};
  }
}

export function upsertUnlistedToken(
  map: Record<string, string>,
  beatId: string,
  token: string
): Record<string, string> {
  const next = { ...map };
  delete next[beatId];
  next[beatId] = token;
  const keys = Object.keys(next);
  if (keys.length <= UNLISTED_COOKIE_MAX_ENTRIES) return next;
  for (const key of keys.slice(0, keys.length - UNLISTED_COOKIE_MAX_ENTRIES)) {
    delete next[key];
  }
  return next;
}

export function serializeUnlistedCookie(map: Record<string, string>): string {
  return JSON.stringify(map);
}

export function getUnlistedCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: UNLISTED_COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  };
}
