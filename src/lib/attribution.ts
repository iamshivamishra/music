import {
  ATTRIBUTION_SOURCES,
  type AttributionSource,
  type IOrderAttribution,
} from "@/types";

export { ATTRIBUTION_SOURCES, ATTRIBUTION_SOURCE_LABELS } from "@/types";

export const SRC_COOKIE = "tb_src";
export const SRC_BEAT_COOKIE = "tb_src_beat";
export const SRC_TS_COOKIE = "tb_src_ts";
export const SRC_COOKIE_MAX_AGE = 90 * 24 * 60 * 60;
export const SRC_OVERWRITE_WINDOW_MS = 30 * 60 * 1000;

const OBJECT_ID_RE = /^[a-fA-F0-9]{24}$/;
const PDP_PATH_RE = /^\/beats\/([a-fA-F0-9]{24})\/?$/;
const SOURCE_SET = new Set<string>(ATTRIBUTION_SOURCES);

const REFERRER_HOST_MAP: Record<string, AttributionSource> = {
  "instagram.com": "instagram",
  "www.instagram.com": "instagram",
  "l.instagram.com": "instagram",
  "youtube.com": "youtube",
  "www.youtube.com": "youtube",
  "m.youtube.com": "youtube",
  "youtu.be": "youtube",
  "wa.me": "whatsapp",
  "web.whatsapp.com": "whatsapp",
  "api.whatsapp.com": "whatsapp",
};

export function isAttributionSource(value: string): value is AttributionSource {
  return SOURCE_SET.has(value);
}

/** Parse `?src=`. Missing/empty → undefined. Unknown → `other`. Never returns raw input. */
export function parseSrcParam(raw: string | null | undefined): AttributionSource | undefined {
  if (raw == null) return undefined;
  const value = raw.trim().slice(0, 32);
  if (!value) return undefined;
  if (isAttributionSource(value)) return value;
  return "other";
}

export function beatIdFromPath(pathname: string): string | undefined {
  const match = pathname.match(PDP_PATH_RE);
  return match?.[1];
}

export function isObjectIdString(value: string): boolean {
  return OBJECT_ID_RE.test(value);
}

export function shouldOverwriteSrc(existingTs: number | undefined, now: number): boolean {
  if (existingTs == null || Number.isNaN(existingTs)) return true;
  return now - existingTs >= SRC_OVERWRITE_WINDOW_MS;
}

function hostnameWithoutPort(host: string): string {
  return host.replace(/:\d+$/, "").toLowerCase();
}

function sourceFromSameOriginPath(url: URL): AttributionSource | undefined {
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (path.startsWith("/embed")) return "embed";
  if (path.startsWith("/producer")) return "profile";
  if (path.startsWith("/charts")) return "charts";
  if (path.startsWith("/offer")) return "offer";
  if (path === "/beats") {
    if (url.searchParams.get("search") || url.searchParams.get("q")) return "search";
    return "marketplace";
  }
  return undefined;
}

export function sourceFromReferrer(
  referer: string | null | undefined,
  origin: string
): AttributionSource | undefined {
  if (!referer) return undefined;
  try {
    const url = new URL(referer);
    let appOrigin: URL;
    try {
      appOrigin = new URL(origin);
    } catch {
      return "other";
    }
    if (url.origin === appOrigin.origin) {
      return sourceFromSameOriginPath(url);
    }
    const host = hostnameWithoutPort(url.hostname);
    return REFERRER_HOST_MAP[host] ?? "other";
  } catch {
    return undefined;
  }
}

export function appendSrc(url: string, source: AttributionSource): string {
  try {
    const absolute = /^https?:\/\//i.test(url);
    const parsed = new URL(url, "http://tb.invalid");
    parsed.searchParams.set("src", source);
    if (absolute) return parsed.toString();
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    const sep = url.includes("?") ? "&" : "?";
    return `${url}${sep}src=${source}`;
  }
}

export function parseCookieHeader(header: string | undefined | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx < 0) continue;
    const name = part.slice(0, idx).trim();
    const value = decodeURIComponent(part.slice(idx + 1).trim());
    if (name) out[name] = value;
  }
  return out;
}

export interface CookieReader {
  get(name: string): { value: string } | undefined;
}

export function attributionFromCookies(cookies: CookieReader): IOrderAttribution {
  const source = parseSrcParam(cookies.get(SRC_COOKIE)?.value) ?? "direct";
  const beatRaw = cookies.get(SRC_BEAT_COOKIE)?.value;
  if (beatRaw && isObjectIdString(beatRaw)) {
    return { source, beatId: beatRaw };
  }
  return { source };
}

export interface CaptureCookieJar {
  get(name: string): string | undefined;
  set(name: string, value: string, maxAge: number): void;
}

export function captureAttribution(input: {
  pathname: string;
  srcParam: string | null;
  referrer: string;
  origin: string;
  cookies: CaptureCookieJar;
  now?: number;
}): void {
  const now = input.now ?? Date.now();
  const explicit = parseSrcParam(input.srcParam);
  const existingSrc = parseSrcParam(input.cookies.get(SRC_COOKIE));
  const existingTs = Number(input.cookies.get(SRC_TS_COOKIE));
  const beatId = beatIdFromPath(input.pathname);

  let nextSource: AttributionSource | undefined;

  if (explicit) {
    if (!existingSrc || shouldOverwriteSrc(existingTs, now)) {
      nextSource = explicit;
    }
  } else if (!existingSrc) {
    nextSource = sourceFromReferrer(input.referrer, input.origin);
  }

  if (nextSource) {
    input.cookies.set(SRC_COOKIE, nextSource, SRC_COOKIE_MAX_AGE);
    input.cookies.set(SRC_TS_COOKIE, String(now), SRC_COOKIE_MAX_AGE);
  }

  if (beatId) {
    input.cookies.set(SRC_BEAT_COOKIE, beatId, SRC_COOKIE_MAX_AGE);
  }
}
