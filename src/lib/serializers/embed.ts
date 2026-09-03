import type { IBeat, IUser } from "@/types";
import { appendSrc } from "@/lib/attribution";
import type { EmbedBeat, EmbedBeatDetail, EmbedCatalog } from "@/lib/serializers/embed-types";

function getAppUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
}

function toId(value: { toString(): string } | string): string {
  return typeof value === "string" ? value : value.toString();
}

export function toEmbedBeat(
  beat: IBeat,
  price?: number | null
): EmbedBeat {
  const id = toId(beat._id);
  return {
    id,
    title: beat.title,
    coverUrl: beat.coverUrl || "",
    previewUrl: beat.audioTaggedUrl,
    genre: beat.genre,
    bpm: beat.bpm,
    price: price ?? undefined,
    pdpUrl: appendSrc(`${getAppUrl()}/beats/${id}`, "embed"),
  };
}

export function toEmbedBeatDetail(
  beat: IBeat,
  producer: Pick<IUser, "displayName" | "name"> | null,
  price?: number | null
): EmbedBeatDetail {
  return {
    ...toEmbedBeat(beat, price),
    key: beat.key,
    producerName: producer?.displayName || producer?.name || "Unknown",
  };
}

export function toEmbedCatalog(
  producer: Pick<IUser, "displayName" | "name" | "username" | "avatarUrl">,
  beats: EmbedBeat[]
): EmbedCatalog {
  const username = producer.username || "";
  const appUrl = getAppUrl();
  return {
    name: producer.displayName || producer.name,
    username,
    avatarUrl: producer.avatarUrl || "",
    beats,
    profileUrl: appendSrc(`${appUrl}/producer/${username}`, "embed"),
    homeUrl: appUrl,
  };
}
