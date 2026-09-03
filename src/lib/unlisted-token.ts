import { cookies } from "next/headers";
import {
  UNLISTED_COOKIE_NAME,
  getUnlistedCookieOptions,
  parseUnlistedCookie,
  serializeUnlistedCookie,
  upsertUnlistedToken,
} from "@/lib/unlisted-cookie";

export async function readUnlistedTokenFromCookies(
  beatId: string
): Promise<string | undefined> {
  const cookieStore = await cookies();
  const map = parseUnlistedCookie(cookieStore.get(UNLISTED_COOKIE_NAME)?.value);
  return map[beatId];
}

export async function writeUnlistedToken(beatId: string, token: string): Promise<void> {
  const cookieStore = await cookies();
  const map = upsertUnlistedToken(
    parseUnlistedCookie(cookieStore.get(UNLISTED_COOKIE_NAME)?.value),
    beatId,
    token
  );
  cookieStore.set(
    UNLISTED_COOKIE_NAME,
    serializeUnlistedCookie(map),
    getUnlistedCookieOptions()
  );
}

export async function resolveUnlistedAccessToken(options: {
  beatId: string;
  queryToken?: string | null;
  bodyToken?: string | null;
}): Promise<string | undefined> {
  const fromQuery = options.queryToken?.trim();
  if (fromQuery) return fromQuery;
  const fromBody = options.bodyToken?.trim();
  if (fromBody) return fromBody;
  return readUnlistedTokenFromCookies(options.beatId);
}
