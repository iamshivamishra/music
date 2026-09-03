import type { FileCategory } from "./keys";

export const FILE_LIMITS = {
  preview: {
    maxSize: 20 * 1024 * 1024,
    allowedTypes: ["audio/mpeg", "audio/mp3"],
    label: "Preview MP3",
  },
  master: {
    maxSize: 100 * 1024 * 1024,
    allowedTypes: ["audio/wav", "audio/x-wav"],
    label: "Master WAV",
  },
  stems: {
    maxSize: 500 * 1024 * 1024,
    allowedTypes: ["application/zip", "application/x-zip-compressed"],
    label: "Stems ZIP",
  },
  artwork: {
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    label: "Artwork",
  },
  avatar: {
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    label: "Avatar",
  },
  cover: {
    maxSize: 5 * 1024 * 1024,
    allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    label: "Cover Image",
  },
  "service-delivery": {
    maxSize: 500 * 1024 * 1024,
    allowedTypes: ["application/zip", "application/x-zip-compressed"],
    label: "Service delivery ZIP",
  },
} as const satisfies Record<
  FileCategory,
  { maxSize: number; allowedTypes: readonly string[]; label: string }
>;

export function validateFile(
  file: { size: number; type: string },
  category: FileCategory
): { valid: true } | { valid: false; error: string } {
  const limits = FILE_LIMITS[category];

  if (!(limits.allowedTypes as readonly string[]).includes(file.type)) {
    return {
      valid: false,
      error: `Invalid file type for ${limits.label}. Allowed: ${limits.allowedTypes.join(", ")}`,
    };
  }

  if (file.size > limits.maxSize) {
    const maxMB = Math.round(limits.maxSize / (1024 * 1024));
    return {
      valid: false,
      error: `${limits.label} must be under ${maxMB} MB`,
    };
  }

  return { valid: true };
}
