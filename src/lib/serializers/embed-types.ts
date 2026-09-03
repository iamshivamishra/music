export type EmbedTheme = "dark" | "light";
export type EmbedSize = "compact" | "full";

export interface EmbedBeat {
  id: string;
  title: string;
  coverUrl: string;
  previewUrl: string;
  genre: string;
  bpm?: number;
  price?: number;
  pdpUrl: string;
}

export interface EmbedBeatDetail extends EmbedBeat {
  key?: string;
  producerName: string;
}

export interface EmbedCatalog {
  name: string;
  username: string;
  avatarUrl: string;
  beats: EmbedBeat[];
  profileUrl: string;
  homeUrl: string;
}

export function formatEmbedPrice(price: number): string {
  return `₹${price.toLocaleString("en-IN")}`;
}
