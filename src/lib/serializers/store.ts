import type { IBeat, IBeatPack, IUser } from "@/types";
import type { PublicServiceListingDto } from "@/lib/serializers/service-listing";
import { serializeLean } from "@/lib/serializers/lean";
import { toPublicProducer, type PublicProducer } from "@/lib/serializers/producer";
import { toPublicPackForUi } from "@/lib/serializers/pack";

export type StoreBeat = IBeat & { producerTier?: "founding" | "standard" };

export interface StoreBeatItem {
  beat: StoreBeat;
  startingPrice: number | null;
}

export type StoreFeaturedPack = ReturnType<typeof toPublicPackForUi>;

export interface StoreProfileData {
  producer: PublicProducer;
  beats: StoreBeatItem[];
  pinned: StoreBeatItem[];
  catalog: StoreBeatItem[];
  featuredPack: StoreFeaturedPack | null;
  totalPlays: number;
}

export interface ProducerProfileData extends StoreProfileData {
  services: PublicServiceListingDto[];
}

export interface StoreEditorBeat {
  _id: string;
  title: string;
  genre: string;
  coverUrl?: string;
}

export interface StoreEditorPack {
  _id: string;
  title: string;
  coverImages: string[];
  genre: string;
  beatCount: number;
}

export interface StoreEditorData {
  producer: {
    username?: string;
    displayName: string;
    avatarUrl?: string;
    coverImageUrl?: string;
    hasWhatsApp: boolean;
  };
  store: {
    headline: string;
    showWhatsApp: boolean;
    pinnedBeatIds: string[];
    featuredPackId: string | null;
  };
  beats: StoreEditorBeat[];
  packs: StoreEditorPack[];
}

function toId(value: string | { toString(): string }): string {
  return typeof value === "string" ? value : value.toString();
}

export function toStoreBeatItem(
  beat: IBeat,
  producer: IUser,
  startingPrice: number | null
): StoreBeatItem {
  return serializeLean({
    beat: {
      ...beat,
      producerName: producer.displayName || producer.name,
      producerUsername: producer.username,
      producerTier: producer.producerTier,
    },
    startingPrice,
  });
}

export function toStoreProfile(input: {
  producer: IUser;
  beats: StoreBeatItem[];
  pinned: StoreBeatItem[];
  catalog: StoreBeatItem[];
  featuredPack: StoreFeaturedPack | null;
  totalPlays: number;
}): StoreProfileData {
  return serializeLean({
    producer: toPublicProducer(input.producer),
    beats: input.beats,
    pinned: input.pinned,
    catalog: input.catalog,
    featuredPack: input.featuredPack,
    totalPlays: input.totalPlays,
  });
}

export function toStoreEditorData(input: {
  producer: IUser;
  beats: IBeat[];
  packs: IBeatPack[];
}): StoreEditorData {
  return serializeLean({
    producer: {
      username: input.producer.username,
      displayName: input.producer.displayName || input.producer.name,
      avatarUrl: input.producer.avatarUrl,
      coverImageUrl: input.producer.coverImageUrl,
      hasWhatsApp: Boolean(input.producer.socialLinks?.whatsappNumber),
    },
    store: {
      headline: input.producer.store?.headline ?? "",
      showWhatsApp: input.producer.store?.showWhatsApp !== false,
      pinnedBeatIds: (input.producer.store?.pinnedBeatIds ?? []).map(toId),
      featuredPackId: input.producer.store?.featuredPackId
        ? toId(input.producer.store.featuredPackId)
        : null,
    },
    beats: input.beats.map((beat) => ({
      _id: toId(beat._id),
      title: beat.title,
      genre: beat.genre,
      coverUrl: beat.coverUrl,
    })),
    packs: input.packs.map((pack) => ({
      _id: toId(pack._id),
      title: pack.title,
      coverImages: pack.coverImages ?? [],
      genre: pack.genre,
      beatCount: pack.beats?.length ?? 0,
    })),
  });
}
