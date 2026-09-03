import { cartRepository } from "@/lib/repositories/cart.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { packRepository } from "@/lib/repositories/pack.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { NotFoundError, ConflictError } from "@/lib/errors";
import { isLicensable } from "@/lib/services/beat-access";
import { assertBeatPurchasable, assertLicenseValid } from "@/lib/services/purchase-guards";
import { findActiveTier } from "@/lib/utils/pack-helpers";
import { logger } from "@/lib/logger";
import type { CartItemPopulated, PackCartItemPopulated, LicenseType } from "@/types";

export const cartService = {
  async getItems(userId: string): Promise<CartItemPopulated[]> {
    const items = await cartRepository.findByUser(userId);
    const beatItems = items.filter((i) => i.beatId);
    const beatIds = [...new Set(beatItems.map((item) => item.beatId!.toString()))];
    const licenseIds = [...new Set(beatItems.map((item) => item.licenseId!.toString()))];

    const [beats, licenses] = await Promise.all([
      beatRepository.findByIds(beatIds),
      licenseRepository.findByIds(licenseIds),
    ]);
    const beatMap = new Map(beats.map((beat) => [beat._id.toString(), beat]));
    const licenseMap = new Map(licenses.map((license) => [license._id.toString(), license]));

    const producerIds = [
      ...new Set(
        beats
          .map((beat) => beat.producerId?.toString())
          .filter((producerId): producerId is string => !!producerId)
      ),
    ];
    const producers = await userRepository.findByIds(producerIds);
    const producerMap = new Map(producers.map((producer) => [producer._id.toString(), producer]));

    const populated: CartItemPopulated[] = [];
    for (const item of beatItems) {
      const beat = beatMap.get(item.beatId!.toString());
      const license = licenseMap.get(item.licenseId!.toString());

      if (!beat || !isLicensable(beat) || !license || !license.isActive) {
        await cartRepository.remove(userId, item.beatId!.toString());
        continue;
      }

      const producer = producerMap.get(beat.producerId.toString());

      populated.push({
        beatId: beat._id.toString(),
        licenseId: license._id.toString(),
        beatTitle: beat.title,
        beatCoverUrl: beat.coverUrl,
        beatGenre: beat.genre,
        producerName: producer?.displayName || producer?.name || "Unknown",
        licenseName: license.name,
        licenseType: license.type,
        price: license.price,
      });
    }

    return populated;
  },

  async getPackItems(userId: string): Promise<PackCartItemPopulated[]> {
    const items = await cartRepository.findByUser(userId);
    const packItems = items.filter((i) => i.packId);

    if (packItems.length === 0) return [];

    const packIds = [...new Set(packItems.map((i) => i.packId!.toString()))];
    const packs = await packRepository.findByIds(packIds);
    const packMap = new Map(packs.map((p) => [p._id.toString(), p]));

    const producerIds = [...new Set(packs.map((p) => p.producerId.toString()))];
    const producers = await userRepository.findByIds(producerIds);
    const producerMap = new Map(producers.map((p) => [p._id.toString(), p]));

    const populated: PackCartItemPopulated[] = [];
    for (const item of packItems) {
      const pack = packMap.get(item.packId!.toString());
      if (!pack || !pack.isPublished || pack.status !== "published") {
        await cartRepository.removePack(userId, item.packId!.toString());
        continue;
      }

      const tier = findActiveTier(pack, item.packTier!);
      if (!tier) {
        await cartRepository.removePack(userId, item.packId!.toString());
        continue;
      }

      const producer = producerMap.get(pack.producerId.toString());
      populated.push({
        packId: pack._id.toString(),
        packTitle: pack.title,
        packCoverUrl: pack.coverImages[0],
        packGenre: pack.genre,
        producerName: producer?.displayName || producer?.name || "Unknown",
        packTier: tier.type,
        tierName: tier.name,
        price: tier.price,
        beatCount: pack.beats.length,
      });
    }

    return populated;
  },

  async addItem(
    userId: string,
    beatId: string,
    licenseId: string,
    accessToken?: string
  ): Promise<void> {
    const beat = await beatRepository.findById(beatId);
    assertBeatPurchasable(beat, undefined, { accessToken });

    if (beat.saleMode === "pack_only") {
      throw new ConflictError("This beat is only available as part of a pack");
    }

    const license = await licenseRepository.findById(licenseId);
    assertLicenseValid(license, beatId);

    const alreadyPurchased = await purchaseRepository.hasPurchased(userId, beatId);
    if (alreadyPurchased) {
      throw new ConflictError("You already own a license for this beat");
    }

    await cartRepository.add(userId, beatId, licenseId);
    logger.info("Cart item added", { userId, beatId, licenseId });
  },

  async addPackItem(userId: string, packId: string, packTier: LicenseType): Promise<void> {
    const pack = await packRepository.findById(packId);
    if (!pack) throw new NotFoundError("Beat Pack");
    if (!pack.isPublished || pack.status !== "published") {
      throw new ConflictError("This pack is not available for purchase");
    }

    const tier = findActiveTier(pack, packTier);
    if (!tier) throw new ConflictError("This tier is not available");

    const existingPurchase = await purchaseRepository.hasPackPurchase(userId, packId);
    if (existingPurchase) {
      throw new ConflictError("You already own this pack. Use the upgrade option to change tiers.");
    }

    await cartRepository.addPack(userId, packId, packTier);
    logger.info("Pack cart item added", { userId, packId, packTier });
  },

  async updateLicense(userId: string, beatId: string, licenseId: string): Promise<void> {
    const existing = await cartRepository.findOne(userId, beatId);
    if (!existing) throw new NotFoundError("Cart item");

    const license = await licenseRepository.findById(licenseId);
    if (!license) throw new NotFoundError("License");
    if (!license.isActive) {
      throw new ConflictError("This license is no longer available");
    }
    if (license.beatId.toString() !== beatId) {
      throw new ConflictError("License does not belong to this beat");
    }

    await cartRepository.updateLicense(userId, beatId, licenseId);
    logger.info("Cart license updated", { userId, beatId, licenseId });
  },

  async updatePackTier(userId: string, packId: string, packTier: LicenseType): Promise<void> {
    const existing = await cartRepository.findPackItem(userId, packId);
    if (!existing) throw new NotFoundError("Pack cart item");

    const pack = await packRepository.findById(packId);
    if (!pack) throw new NotFoundError("Beat Pack");

    const tier = findActiveTier(pack, packTier);
    if (!tier) throw new ConflictError("This tier is not available");

    await cartRepository.updatePackTier(userId, packId, packTier);
    logger.info("Pack tier updated", { userId, packId, packTier });
  },

  async removeItem(userId: string, beatId: string): Promise<void> {
    await cartRepository.remove(userId, beatId);
    logger.info("Cart item removed", { userId, beatId });
  },

  async removePackItem(userId: string, packId: string): Promise<void> {
    await cartRepository.removePack(userId, packId);
    logger.info("Pack cart item removed", { userId, packId });
  },

  async clearCart(userId: string): Promise<void> {
    await cartRepository.clear(userId);
    logger.info("Cart cleared", { userId });
  },

  async getCount(userId: string): Promise<number> {
    return cartRepository.count(userId);
  },

  async getMixedItems(userId: string): Promise<{
    beatItems: CartItemPopulated[];
    packItems: PackCartItemPopulated[];
  }> {
    const [beatItems, packItems] = await Promise.all([
      this.getItems(userId),
      this.getPackItems(userId),
    ]);
    return { beatItems, packItems };
  },

  async getTotal(userId: string): Promise<number> {
    const { beatItems, packItems } = await this.getMixedItems(userId);
    return (
      beatItems.reduce((sum, item) => sum + item.price, 0) +
      packItems.reduce((sum, item) => sum + item.price, 0)
    );
  },
};
