import type { EmbedSize, EmbedTheme } from "@/lib/serializers/embed-types";

export const EMBED_IFRAME_DIMENSIONS = {
  compact: { width: 300, height: 80 },
  full: { width: 400, height: 180 },
  catalog: { width: 400, height: 500 },
} as const;

export type EmbedSnippetKind = "beat" | "catalog";

export function buildEmbedUrl(input: {
  origin: string;
  beatId?: string;
  username?: string;
  theme: EmbedTheme;
  size: EmbedSize;
  kind: EmbedSnippetKind;
}): string {
  const origin = input.origin.replace(/\/$/, "");
  if (input.kind === "catalog" && input.username) {
    return `${origin}/embed/producer/${input.username}?theme=${input.theme}`;
  }
  return `${origin}/embed/${input.beatId}?theme=${input.theme}&size=${input.size}`;
}

export function embedIframeSize(kind: EmbedSnippetKind, size: EmbedSize) {
  return kind === "catalog"
    ? EMBED_IFRAME_DIMENSIONS.catalog
    : EMBED_IFRAME_DIMENSIONS[size];
}

export function buildEmbedSnippet(input: {
  origin: string;
  beatId?: string;
  username?: string;
  theme: EmbedTheme;
  size: EmbedSize;
  kind: EmbedSnippetKind;
}): { url: string; width: number; height: number; html: string } {
  const url = buildEmbedUrl(input);
  const { width, height } = embedIframeSize(input.kind, input.size);
  const html = `<iframe src="${url}" width="${width}" height="${height}" frameborder="0" allow="autoplay; encrypted-media" loading="lazy" style="border-radius: 8px;"></iframe>`;
  return { url, width, height, html };
}
