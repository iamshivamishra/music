import type { ClientSession } from "mongoose";
import { userRepository } from "@/lib/repositories/user.repository";
import { storeService } from "@/lib/services/store.service";
import { serviceListingService } from "@/lib/services/service-listing.service";
import { toPublicBeatPayload } from "@/lib/serializers/beat";
import { toPublicServiceListing } from "@/lib/serializers/service-listing";
import type { ProducerProfileData } from "@/lib/serializers/store";
import { generateUsername } from "@/lib/username";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { NotFoundError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import type { IUser } from "@/types";
import type { UpdateProducerTierInput } from "@/lib/validators/invitation";

export type { ProducerProfileData };

export const producerService = {
  async allocateUniqueUsername(name: string, excludeUserId?: string): Promise<string> {
    const base = generateUsername(name) || "producer";
    const taken = await userRepository.usernameExists(base, excludeUserId);
    if (!taken) return base;
    return `${base}-${Date.now().toString(36)}`;
  },

  async resolveUsernameForRedirect(slug: string): Promise<string | null> {
    const producer = await userRepository.findBySlug(slug);
    if (!producer) return null;
    return producer.username || slug;
  },

  async getProfileData(username: string): Promise<ProducerProfileData | null> {
    const store = await storeService.getStore(username);
    if (!store) return null;
    const merchandised = isFeatureEnabled("linkInBioStore")
      ? store
      : { ...store, pinned: [], featuredPack: null, catalog: store.beats };
    const listings = isFeatureEnabled("customServices")
      ? await serviceListingService.listPublishedForProducer(store.producer.id)
      : [];
    const services = listings.map((listing) =>
      toPublicServiceListing(listing, {
        displayName: store.producer.displayName,
        name: store.producer.name,
        username: store.producer.username,
        socialLinks: store.producer.socialLinks,
      })
    );
    return { ...merchandised, services };
  },

  async getPublicBySlug(slug: string) {
    const data = await this.getProfileData(slug);
    if (!data) return null;
    return {
      producer: data.producer,
      beats: data.beats.map((item) => toPublicBeatPayload(item.beat)),
      pinned: data.pinned.map((item) => ({
        beat: toPublicBeatPayload(item.beat),
        startingPrice: item.startingPrice,
      })),
      featuredPack: data.featuredPack,
      services: data.services,
    };
  },

  async ensureProducerAccount(
    userId: string,
    options: { session?: ClientSession } = {}
  ): Promise<IUser> {
    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("User");

    const username = user.username || (await this.allocateUniqueUsername(user.name, userId));
    const updated = await userRepository.update(
      userId,
      {
        role: "producer",
        username,
        displayName: user.displayName || user.name,
      },
      options
    );
    if (!updated) throw new NotFoundError("User");
    return updated;
  },

  async updateTier(
    producerId: string,
    input: UpdateProducerTierInput,
    adminId: string
  ): Promise<IUser> {
    const set: Record<string, unknown> = {};
    const unset: string[] = [];

    if (input.producerTier === "standard") {
      set.producerTier = "standard";
      if (input.platformFeeOverride === undefined) {
        unset.push("platformFeeOverride");
      } else {
        set.platformFeeOverride = input.platformFeeOverride;
      }
      if (input.producerTierExpiresAt === undefined) {
        unset.push("producerTierExpiresAt");
      } else {
        set.producerTierExpiresAt = new Date(input.producerTierExpiresAt);
      }
    } else {
      if (input.producerTier !== undefined) set.producerTier = input.producerTier;
      if (input.platformFeeOverride !== undefined) {
        set.platformFeeOverride = input.platformFeeOverride;
      }
      if (input.producerTierExpiresAt !== undefined) {
        set.producerTierExpiresAt = new Date(input.producerTierExpiresAt);
      }
    }

    const user = await userRepository.updateAndUnset(producerId, set, unset);
    if (!user) throw new NotFoundError("User");

    audit({
      action: "admin.action",
      userId: adminId,
      resourceType: "user",
      resourceId: producerId,
      metadata: { action: "producer_tier_updated", set, unset },
    });

    return user;
  },

  async searchByUsername(query: string, excludeUserId: string) {
    const results = await userRepository.searchProducersByUsername(query, 8);
    return results
      .filter((user) => user._id.toString() !== excludeUserId && user.username)
      .map((user) => ({
        id: user._id.toString(),
        username: user.username!,
        displayName: user.displayName || user.name,
        avatarUrl: user.avatarUrl,
      }));
  },
};
