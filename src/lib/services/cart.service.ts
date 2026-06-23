import { cartRepository } from "@/lib/repositories/cart.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { NotFoundError, ConflictError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import type { CartItemPopulated } from "@/types";

export const cartService = {
  async getItems(userId: string): Promise<CartItemPopulated[]> {
    const items = await cartRepository.findByUser(userId);

    const populated: CartItemPopulated[] = [];
    for (const item of items) {
      const [beat, license] = await Promise.all([
        beatRepository.findById(item.beatId.toString()),
        licenseRepository.findById(item.licenseId.toString()),
      ]);

      if (!beat || !license || !license.isActive) {
        await cartRepository.remove(userId, item.beatId.toString());
        continue;
      }

      const producer = await userRepository.findById(beat.producerId.toString());

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

  async addItem(userId: string, beatId: string, licenseId: string): Promise<void> {
    const beat = await beatRepository.findById(beatId);
    if (!beat) throw new NotFoundError("Beat");

    const license = await licenseRepository.findById(licenseId);
    if (!license) throw new NotFoundError("License");
    if (license.beatId.toString() !== beatId) {
      throw new ConflictError("License does not belong to this beat");
    }

    const alreadyPurchased = await purchaseRepository.hasPurchased(userId, beatId);
    if (alreadyPurchased) {
      throw new ConflictError("You already own a license for this beat");
    }

    await cartRepository.add(userId, beatId, licenseId);
    logger.info("Cart item added", { userId, beatId, licenseId });
  },

  async updateLicense(userId: string, beatId: string, licenseId: string): Promise<void> {
    const existing = await cartRepository.findOne(userId, beatId);
    if (!existing) throw new NotFoundError("Cart item");

    const license = await licenseRepository.findById(licenseId);
    if (!license) throw new NotFoundError("License");
    if (license.beatId.toString() !== beatId) {
      throw new ConflictError("License does not belong to this beat");
    }

    await cartRepository.updateLicense(userId, beatId, licenseId);
    logger.info("Cart license updated", { userId, beatId, licenseId });
  },

  async removeItem(userId: string, beatId: string): Promise<void> {
    await cartRepository.remove(userId, beatId);
    logger.info("Cart item removed", { userId, beatId });
  },

  async clearCart(userId: string): Promise<void> {
    await cartRepository.clear(userId);
    logger.info("Cart cleared", { userId });
  },

  async getCount(userId: string): Promise<number> {
    return cartRepository.count(userId);
  },

  async getTotal(userId: string): Promise<number> {
    const items = await this.getItems(userId);
    return items.reduce((sum, item) => sum + item.price, 0);
  },
};
