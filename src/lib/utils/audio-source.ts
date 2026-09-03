/**
 * Validates and normalizes an audio source URL.
 * Returns the URL if valid, or null if it cannot be used as an audio source.
 */
export function normalizeAudioSource(url: string | undefined | null): string | null {
  if (!url || typeof url !== "string") return null;

  const trimmed = url.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith("data:audio/")) return trimmed;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return trimmed;
    }
  } catch {
    // invalid URL
  }

  return null;
}
