import type { IUser } from "@/types";
import { serializeLean } from "@/lib/serializers/lean";

function toId(value: string | { toString(): string }): string {
  return typeof value === "string" ? value : value.toString();
}

export function toPublicProducer(producer: IUser) {
  return serializeLean({
    id: toId(producer._id),
    name: producer.name,
    displayName: producer.displayName,
    username: producer.username,
    bio: producer.bio,
    avatarUrl: producer.avatarUrl,
    coverImageUrl: producer.coverImageUrl,
    image: producer.image,
    genres: producer.genres,
    socialLinks: producer.socialLinks,
    verified: producer.verified,
    producerTier: producer.producerTier,
    followersCount: producer.followersCount,
    salesCount: producer.salesCount,
    store: {
      headline: producer.store?.headline,
      showWhatsApp: producer.store?.showWhatsApp !== false,
    },
  });
}

export type PublicProducer = ReturnType<typeof toPublicProducer>;
