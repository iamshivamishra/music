import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { orderRepository } from "@/lib/repositories/order.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { packRepository } from "@/lib/repositories/pack.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { licenseVerifyService } from "@/lib/services/license-verify.service";
import { NotFoundError } from "@/lib/errors";
import { findTier } from "@/lib/utils/pack-helpers";
import type { IPurchase, IOrder, PaginatedResult, BuyerStats, OrderStatus } from "@/types";

export interface BeatPurchaseItem {
  purchaseId: string;
  beatId: string;
  beatTitle: string;
  beatCoverUrl?: string;
  beatGenre: string;
  producerName: string;
  licenseType: string;
  includesWav: boolean;
  includesStems: boolean;
  amount: number;
  purchasedAt: Date;
}

export interface PackPurchaseItem {
  purchaseId: string;
  packId: string;
  packTitle: string;
  packCoverUrl?: string;
  packGenre: string;
  producerName: string;
  packTier: string;
  includesWav: boolean;
  includesStems: boolean;
  beatCount: number;
  amount: number;
  purchasedAt: Date;
}

export interface LicenseCertificate {
  purchaseId: string;
  type: "beat" | "pack";
  title: string;
  producerName: string;
  licenseType: string;
  licenseNumber?: string;
  includesWav: boolean;
  includesStems: boolean;
  commercialUse: boolean;
  streamLimit: number;
  amount: number;
  orderId: string;
  paymentId: string;
  purchasedAt: Date;
}

export const purchaseService = {
  async getBeatPurchasesPaginated(
    buyerId: string,
    page: number,
    limit: number
  ): Promise<PaginatedResult<BeatPurchaseItem>> {
    const result = await purchaseRepository.findByBuyerIdPaginated(buyerId, {
      page,
      limit,
      type: "beat",
    });

    const beatIds = [
      ...new Set(result.data.filter((p) => p.beatId).map((p) => p.beatId!.toString())),
    ];
    const beats = beatIds.length > 0 ? await beatRepository.findByIds(beatIds) : [];
    const beatMap = new Map(beats.map((b) => [b._id.toString(), b]));

    const producerIds = [...new Set(beats.map((b) => b.producerId.toString()))];
    const producers = producerIds.length > 0 ? await userRepository.findByIds(producerIds) : [];
    const producerMap = new Map(producers.map((p) => [p._id.toString(), p]));

    const items: BeatPurchaseItem[] = result.data.map((p) => {
      const beat = p.beatId ? beatMap.get(p.beatId.toString()) : null;
      const producer = beat ? producerMap.get(beat.producerId.toString()) : null;
      return {
        purchaseId: p._id.toString(),
        beatId: p.beatId?.toString() ?? "",
        beatTitle: beat?.title ?? "Beat no longer available",
        beatCoverUrl: beat?.coverUrl,
        beatGenre: beat?.genre ?? "",
        producerName: producer?.displayName || producer?.name || "Unknown",
        licenseType: p.licenseType ?? "basic",
        includesWav: p.includesWav ?? false,
        includesStems: p.includesStems ?? false,
        amount: p.amount,
        purchasedAt: p.createdAt,
      };
    });

    return { ...result, data: items };
  },

  async getPackPurchasesPaginated(
    buyerId: string,
    page: number,
    limit: number
  ): Promise<PaginatedResult<PackPurchaseItem>> {
    const result = await purchaseRepository.findByBuyerIdPaginated(buyerId, {
      page,
      limit,
      type: "pack",
    });

    const packIds = [
      ...new Set(result.data.filter((p) => p.packId).map((p) => p.packId!.toString())),
    ];
    const packs = packIds.length > 0 ? await packRepository.findByIds(packIds) : [];
    const packMap = new Map(packs.map((pk) => [pk._id.toString(), pk]));

    const producerIds = [...new Set(packs.map((pk) => pk.producerId.toString()))];
    const producers = producerIds.length > 0 ? await userRepository.findByIds(producerIds) : [];
    const producerMap = new Map(producers.map((p) => [p._id.toString(), p]));

    const items: PackPurchaseItem[] = result.data.map((p) => {
      const pack = p.packId ? packMap.get(p.packId.toString()) : null;
      const producer = pack ? producerMap.get(pack.producerId.toString()) : null;
      return {
        purchaseId: p._id.toString(),
        packId: p.packId?.toString() ?? "",
        packTitle: pack?.title ?? "Pack no longer available",
        packCoverUrl: pack?.coverImages?.[0],
        packGenre: pack?.genre ?? "",
        producerName: producer?.displayName || producer?.name || "Unknown",
        packTier: p.packTier ?? "basic",
        includesWav: p.includesWav ?? false,
        includesStems: p.includesStems ?? false,
        beatCount: pack?.beats?.length ?? 0,
        amount: p.amount,
        purchasedAt: p.createdAt,
      };
    });

    return { ...result, data: items };
  },

  async getTransactionsPaginated(
    buyerId: string,
    page: number,
    limit: number,
    status?: OrderStatus
  ): Promise<PaginatedResult<IOrder>> {
    return orderRepository.findByBuyerPaginated(buyerId, { page, limit, status });
  },

  async getBuyerStats(
    buyerId: string
  ): Promise<BuyerStats & { recentPurchases: IPurchase[] }> {
    const [raw, user] = await Promise.all([
      purchaseRepository.getBuyerAggregation(buyerId),
      userRepository.findById(buyerId),
    ]);

    const tierMix: Record<string, number> = {};
    let dominantTier: string | null = null;
    let maxCount = 0;
    for (const t of raw.tierMixArr) {
      tierMix[t._id] = t.count;
      if (t.count > maxCount) {
        maxCount = t.count;
        dominantTier = t._id;
      }
    }

    return {
      totalSpend: raw.totalSpend,
      beatCount: raw.beatCount,
      packCount: raw.packCount,
      tierMix,
      dominantTier,
      memberSince: user?.createdAt ?? new Date(),
      recentPurchases: raw.recentPurchases,
    };
  },

  async verifyLicense(
    purchaseId: string,
    buyerId: string
  ): Promise<LicenseCertificate> {
    const purchase = await purchaseRepository.findByIdAndBuyer(purchaseId, buyerId);
    if (!purchase) throw new NotFoundError("License");

    if (purchase.packId) {
      const pack = await packRepository.findById(purchase.packId.toString());
      const producer = pack
        ? await userRepository.findById(pack.producerId.toString())
        : null;
      const tier = pack && purchase.packTier ? findTier(pack, purchase.packTier) : undefined;

      const licenseNumber =
        purchase.licenseNumber || licenseVerifyService.generateLicenseNumber(purchase._id.toString());

      return {
        purchaseId: purchase._id.toString(),
        type: "pack",
        title: pack?.title ?? "Pack no longer available",
        producerName: producer?.displayName || producer?.name || "Unknown",
        licenseType: purchase.packTier ?? "basic",
        licenseNumber,
        includesWav: tier?.includesWav ?? purchase.includesWav ?? false,
        includesStems: tier?.includesStems ?? purchase.includesStems ?? false,
        commercialUse: tier?.commercialUse ?? false,
        streamLimit: tier?.streamLimit ?? 0,
        amount: purchase.amount,
        orderId: purchase.orderId,
        paymentId: purchase.paymentId,
        purchasedAt: purchase.createdAt,
      };
    }

    const [beat, license] = await Promise.all([
      purchase.beatId ? beatRepository.findById(purchase.beatId.toString()) : null,
      purchase.licenseId ? licenseRepository.findById(purchase.licenseId.toString()) : null,
    ]);
    const producer = beat
      ? await userRepository.findById(beat.producerId.toString())
      : null;

    const licenseNumber =
      purchase.licenseNumber || licenseVerifyService.generateLicenseNumber(purchase._id.toString());

    return {
      purchaseId: purchase._id.toString(),
      type: "beat",
      title: beat?.title ?? "Beat no longer available",
      producerName: producer?.displayName || producer?.name || "Unknown",
      licenseType: purchase.licenseType ?? "basic",
      licenseNumber,
      includesWav: license?.includesWav ?? purchase.includesWav ?? false,
      includesStems: license?.includesStems ?? purchase.includesStems ?? false,
      commercialUse: license?.commercialUse ?? false,
      streamLimit: license?.streamLimit ?? 0,
      amount: purchase.amount,
      orderId: purchase.orderId,
      paymentId: purchase.paymentId,
      purchasedAt: purchase.createdAt,
    };
  },

  async getProfilePageData(buyerId: string) {
    const [user, stats] = await Promise.all([
      userRepository.findById(buyerId),
      this.getBuyerStats(buyerId),
    ]);

    const beatIds = stats.recentPurchases
      .filter((p) => p.beatId)
      .map((p) => p.beatId!.toString());
    const beats = beatIds.length > 0 ? await beatRepository.findByIds(beatIds) : [];
    const beatMap = new Map(beats.map((b) => [b._id.toString(), b]));

    return { user, stats, beatMap };
  },

  async getPurchasedBeatIds(buyerId: string): Promise<string[]> {
    return purchaseRepository.getPurchasedBeatIds(buyerId);
  },

  async getPurchasedBeatIdsForBeats(
    buyerId: string,
    beatIds: string[]
  ): Promise<string[]> {
    return purchaseRepository.getPurchasedBeatIdsForBeats(buyerId, beatIds);
  },
};
