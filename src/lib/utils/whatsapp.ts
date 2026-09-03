import { appendSrc } from "@/lib/attribution";

const INDIAN_MOBILE = /^[6-9]\d{9}$/;
const MAX_SHARE_TEXT_LENGTH = 200;

/**
 * Normalize an Indian WhatsApp number to 10 digits.
 * Accepts `9876543210`, `+91…`, and `91…`.
 *
 * Returns:
 * - `""` when the input is empty, missing, or contains no digits (field cleared).
 * - `null` when digits are present but don't form a valid Indian mobile number.
 * - A 10-digit string on success.
 */
export function normalizeWhatsAppNumber(
  input: string | undefined | null
): string | null {
  if (input === undefined || input === null) return "";

  const digits = input.replace(/\D/g, "");
  if (!digits) return "";

  const local =
    digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;

  if (!INDIAN_MOBILE.test(local)) return null;
  return local;
}

function wrapShareText(title: string, producerName: string | undefined, url: string): string {
  if (producerName) {
    return `Check out "${title}" by ${producerName} on Trishul Beats! ${url}`;
  }
  return `Check out "${title}" on Trishul Beats! ${url}`;
}

/** Share copy kept under 200 characters by truncating the title when needed. */
export function buildBeatShareText(
  title: string,
  producerName: string | undefined,
  url: string
): string {
  const full = wrapShareText(title, producerName, url);
  if (full.length <= MAX_SHARE_TEXT_LENGTH) return full;

  const overhead = wrapShareText("", producerName, url).length;
  const available = MAX_SHARE_TEXT_LENGTH - overhead;
  if (available <= 1) return full.slice(0, MAX_SHARE_TEXT_LENGTH);

  const truncated = `${title.slice(0, available - 1)}…`;
  return wrapShareText(truncated, producerName, url);
}

export function buildOfferPayText(params: {
  beatTitle: string;
  amount: number;
  licenseName: string;
  url: string;
}): string {
  return `Here's a custom ${params.licenseName} offer for "${params.beatTitle}" at ₹${params.amount.toLocaleString("en-IN")}. Pay here: ${params.url}`;
}

export function buildBeatInquireText(beatTitle: string): string {
  return `Hi! I'm interested in your beat "${beatTitle}" on Trishul Beats.`;
}

export function buildProfileInquireText(): string {
  return "Hi! I'm interested in your beats on Trishul Beats.";
}

export function buildServiceInquireText(title: string): string {
  return `Hi! I'm interested in your service "${title}" on Trishul Beats.`;
}

function wrapStoreShareText(displayName: string, url: string): string {
  return `Check out ${displayName}'s beats on Trishul Beats! ${url}`;
}

/** Share copy kept under 200 characters by truncating the display name when needed. */
export function buildStoreShareText(displayName: string, url: string): string {
  const full = wrapStoreShareText(displayName, url);
  if (full.length <= MAX_SHARE_TEXT_LENGTH) return full;

  const overhead = wrapStoreShareText("", url).length;
  const available = MAX_SHARE_TEXT_LENGTH - overhead;
  if (available <= 1) return full.slice(0, MAX_SHARE_TEXT_LENGTH);

  const truncated = `${displayName.slice(0, available - 1)}…`;
  return wrapStoreShareText(truncated, url);
}

export function buildWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/** WhatsApp share URL with `?src=whatsapp` on the beat link. */
export function buildWhatsAppBeatShareUrl(
  title: string,
  producerName: string | undefined,
  beatUrl: string
): string {
  return buildWhatsAppShareUrl(
    buildBeatShareText(title, producerName, appendSrc(beatUrl, "whatsapp"))
  );
}

/** Fire-and-forget share counter increment (client-side only). */
export function trackBeatShare(
  beatId: string | undefined,
  source?: "whatsapp"
): void {
  if (!beatId) return;
  const init: RequestInit = { method: "POST" };
  if (source) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify({ source });
  }
  fetch(`/api/beats/${beatId}/share`, init).catch(() => {});
}

/** Mask a phone number for logging — shows only the last 4 digits. */
export function maskPhone(phone: string): string {
  if (phone.length <= 4) return "****";
  return "*".repeat(phone.length - 4) + phone.slice(-4);
}

/** Returns a wa.me chat URL, or null when the number is missing/invalid. */
export function buildWhatsAppInquireUrl(
  number: string | undefined | null,
  text: string
): string | null {
  const digits = normalizeWhatsAppNumber(number);
  if (!digits) return null;
  return `https://wa.me/91${digits}?text=${encodeURIComponent(text)}`;
}
