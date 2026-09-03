import { userRepository } from "@/lib/repositories/user.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { packRepository } from "@/lib/repositories/pack.repository";
import { enrichBeatsWithProducersAndPrices } from "@/lib/services/beat-enrichment";
import { toPublicPackForUi } from "@/lib/serializers/pack";
import {
  toStoreBeatItem,
  toStoreEditorData,
  toStoreProfile,
  type StoreBeatItem,
  type StoreFeaturedPack,
  type StoreProfileData,
  type StoreEditorData,
} from "@/lib/serializers/store";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { assertFeatureEnabled } from "@/lib/assert-feature";
import { audit } from "@/lib/audit";
import { MAX_PINNED_BEATS } from "@/lib/validators/store";
import type { UpdateStoreInput } from "@/lib/validators/store";
import type { IBeat, IBeatPack, IProducerStore, IUser, UserRole } from "@/types";
import { isListed } from "@/lib/beat-listing";

const EDITOR_LIST_LIMIT = 100;
const PIN_VALIDATION_MESSAGE =
  "Each pinned beat must be one of your published, individually licensable beats";
const PACK_VALIDATION_MESSAGE = "Featured pack must be one of your published packs";

function toId(value: string | { toString(): string }): string {
  return typeof value === "string" ? value : value.toString();
}

function isPinEligible(beat: IBeat, producerId: string): boolean {
  return (
    toId(beat.producerId) === producerId &&
    isListed(beat) &&
    beat.saleMode !== "pack_only" &&
    !beat.exclusiveBuyerId
  );
}

function isPublicCatalogBeat(beat: IBeat): boolean {
  return isListed(beat) && !beat.exclusiveBuyerId;
}

function isPublishedOwnedPack(pack: IBeatPack, producerId: string): boolean {
  return (
    toId(pack.producerId) === producerId &&
    pack.isPublished === true &&
    pack.status === "published"
  );
}

function resolvePinnedBeats(
  publicBeats: IBeat[],
  storedPinIds: string[],
  producerId: string
): IBeat[] {
  const eligible = publicBeats.filter((beat) => isPinEligible(beat, producerId));
  const byId = new Map(eligible.map((beat) => [toId(beat._id), beat]));
  const used = new Set<string>();
  const pinned: IBeat[] = [];

  for (const id of storedPinIds) {
    if (pinned.length >= MAX_PINNED_BEATS) break;
    const beat = byId.get(id);
    if (beat) {
      pinned.push(beat);
      used.add(id);
    }
  }

  for (const beat of eligible) {
    if (pinned.length >= MAX_PINNED_BEATS) break;
    const id = toId(beat._id);
    if (!used.has(id)) {
      pinned.push(beat);
      used.add(id);
    }
  }

  return pinned;
}

export const storeService = {
  async getStore(username: string): Promise<StoreProfileData | null> {
    const producer = await userRepository.findByUsername(username);
    if (!producer || producer.role !== "producer") return null;

    const producerId = toId(producer._id);
    const published = await beatRepository.findByProducerId(producerId);
    const publicBeats = published.filter(isPublicCatalogBeat);

    const { enriched, priceMap } = await enrichBeatsWithProducersAndPrices(publicBeats, {
      includeProducer: false,
    });

    const priceOf = (beat: IBeat) => priceMap[toId(beat._id)]?.price ?? null;
    const itemById = new Map<string, StoreBeatItem>(
      enriched.map((beat) => [
        toId(beat._id),
        toStoreBeatItem(beat, producer, priceOf(beat)),
      ])
    );
    const toItem = (beat: IBeat): StoreBeatItem =>
      itemById.get(toId(beat._id)) ?? toStoreBeatItem(beat, producer, priceOf(beat));

    const beats = publicBeats.map(toItem);
    const pinnedOriginals = resolvePinnedBeats(
      publicBeats,
      (producer.store?.pinnedBeatIds ?? []).map(toId),
      producerId
    );
    const pinned = pinnedOriginals.map(toItem);
    const pinnedIds = new Set(pinnedOriginals.map((beat) => toId(beat._id)));
    const catalog = beats.filter((item) => !pinnedIds.has(toId(item.beat._id)));

    let featuredPack: StoreFeaturedPack | null = null;
    const featuredPackId = producer.store?.featuredPackId
      ? toId(producer.store.featuredPackId)
      : undefined;
    if (featuredPackId) {
      const pack = await packRepository.findById(featuredPackId);
      if (pack && isPublishedOwnedPack(pack, producerId)) {
        featuredPack = toPublicPackForUi(pack, producer);
      }
    }

    return toStoreProfile({
      producer,
      beats,
      pinned,
      catalog,
      featuredPack,
      totalPlays: publicBeats.reduce((sum, beat) => sum + (beat.plays ?? 0), 0),
    });
  },

  async updateStore(
    producerId: string,
    input: UpdateStoreInput,
    actorId: string,
    actorRole: UserRole
  ): Promise<IUser> {
    assertFeatureEnabled("linkInBioStore");
    const user = await userRepository.findById(producerId);
    if (!user) throw new NotFoundError("User");
    if (user.role !== "producer") {
      throw new ForbiddenError("Only producers have a store");
    }
    if (actorId !== producerId && actorRole !== "admin") {
      throw new ForbiddenError("You can only edit your own store");
    }

    const pinIds = input.pinnedBeatIds ?? [];
    if (pinIds.length > MAX_PINNED_BEATS) {
      throw new ValidationError(`You can pin at most ${MAX_PINNED_BEATS} beats`);
    }
    if (new Set(pinIds).size !== pinIds.length) {
      throw new ValidationError("Pinned beats must be unique");
    }
    if (pinIds.length > 0) {
      const beats = await beatRepository.findByIds(pinIds);
      const byId = new Map(beats.map((beat) => [toId(beat._id), beat]));
      for (const id of pinIds) {
        const beat = byId.get(id);
        if (!beat || !isPinEligible(beat, producerId)) {
          throw new ValidationError(PIN_VALIDATION_MESSAGE);
        }
      }
    }

    let featuredPackId: string | undefined;
    if (input.featuredPackId) {
      const pack = await packRepository.findById(input.featuredPackId);
      if (!pack || !isPublishedOwnedPack(pack, producerId)) {
        throw new ValidationError(PACK_VALIDATION_MESSAGE);
      }
      featuredPackId = input.featuredPackId;
    }

    const store: IProducerStore = {
      headline: input.headline,
      showWhatsApp: input.showWhatsApp ?? true,
      pinnedBeatIds: pinIds,
      ...(featuredPackId ? { featuredPackId } : {}),
    };

    const updated = await userRepository.updateStore(producerId, store);
    if (!updated) throw new NotFoundError("User");

    audit({
      action: "store.update",
      userId: actorId,
      resourceType: "user",
      resourceId: producerId,
      metadata: {
        pinnedCount: pinIds.length,
        hasHeadline: Boolean(input.headline),
        hasFeaturedPack: Boolean(featuredPackId),
      },
    });

    return updated;
  },

  async getEditorData(producerId: string): Promise<StoreEditorData> {
    assertFeatureEnabled("linkInBioStore");
    const user = await userRepository.findById(producerId);
    if (!user) throw new NotFoundError("User");
    if (user.role !== "producer" && user.role !== "admin") {
      throw new ForbiddenError("Only producers can edit a store");
    }

    const [beatsPage, packsPage] = await Promise.all([
      beatRepository.findByProducerPaginated(producerId, "published", 1, EDITOR_LIST_LIMIT),
      packRepository.findByProducerPaginated(producerId, "published", 1, EDITOR_LIST_LIMIT),
    ]);

    return toStoreEditorData({
      producer: user,
      beats: beatsPage.data.filter((beat) => isPinEligible(beat, producerId)),
      packs: packsPage.data.filter((pack) => isPublishedOwnedPack(pack, producerId)),
    });
  },
};
