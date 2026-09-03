export const BEAT_FILE_CATEGORIES = ["preview", "master", "stems", "artwork"] as const;
export const PROFILE_FILE_CATEGORIES = ["avatar", "cover"] as const;
export const SERVICE_FILE_CATEGORIES = ["service-delivery"] as const;

export type BeatFileCategory = (typeof BEAT_FILE_CATEGORIES)[number];
export type ProfileFileCategory = (typeof PROFILE_FILE_CATEGORIES)[number];
export type ServiceFileCategory = (typeof SERVICE_FILE_CATEGORIES)[number];
export type FileCategory = BeatFileCategory | ProfileFileCategory | ServiceFileCategory;

const BEAT_EXTENSIONS: Record<BeatFileCategory, string> = {
  preview: "mp3",
  master: "wav",
  stems: "zip",
  artwork: "jpg",
};

/**
 * Canonical object keys:
 *   producers/{producerId}/beats/{beatId}/preview.mp3
 *   producers/{producerId}/profile/avatar-{timestamp}.jpg
 */
export function buildBeatKey(
  producerId: string,
  beatId: string,
  category: BeatFileCategory
): string {
  return `producers/${producerId}/beats/${beatId}/${category}.${BEAT_EXTENSIONS[category]}`;
}

export function buildProfileKey(
  producerId: string,
  category: ProfileFileCategory
): string {
  return `producers/${producerId}/profile/${category}-${Date.now()}.jpg`;
}

export function buildLicensePdfKey(purchaseId: string): string {
  return `licenses/${purchaseId}/license.pdf`;
}

export function buildInvoicePdfKey(orderId: string): string {
  return `invoices/${orderId}/invoice.pdf`;
}

export function buildServiceDeliveryKey(producerId: string, jobId: string): string {
  return `producers/${producerId}/jobs/${jobId}/delivery.zip`;
}

export function isOwnedServiceDeliveryKey(
  key: string,
  producerId: string,
  jobId: string
): boolean {
  return key === buildServiceDeliveryKey(producerId, jobId);
}

export function isOwnedBeatAssetKey(
  key: string,
  producerId: string,
  category: BeatFileCategory
): boolean {
  const prefix = `producers/${producerId}/beats/`;
  const suffix = `/${category}.${BEAT_EXTENSIONS[category]}`;
  if (!key.startsWith(prefix) || !key.endsWith(suffix)) return false;

  const beatId = key.slice(prefix.length, key.length - suffix.length);
  return beatId.length > 0 && !beatId.includes("/");
}
