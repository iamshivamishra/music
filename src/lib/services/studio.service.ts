import { beatRepository } from "@/lib/repositories/beat.repository";
import { earningRepository } from "@/lib/repositories/earning.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { beatService } from "@/lib/services/beat.service";
import { collabService } from "@/lib/services/collab.service";
import { resolvePlatformFeePercent } from "@/lib/fees";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { fillMonthlyRevenue, toProducerSaleRow } from "@/lib/serializers/earning";

export const studioService = {
  async getAnalytics(producerId: string) {
    const monthCount = 12;

    const [
      totalEarnings,
      totalSales,
      stats,
      monthlyRaw,
      topBeats,
      producerBeats,
      user,
      pendingCollabInvites,
    ] = await Promise.all([
      earningRepository.sumGrossByProducer(producerId),
      earningRepository.countByProducer(producerId),
      beatService.getProducerStats(producerId),
      earningRepository.getMonthlyRevenueRaw(producerId, monthCount),
      earningRepository.getTopBeats(producerId, 5),
      beatRepository.findByProducerId(producerId, true),
      userRepository.findById(producerId),
      isFeatureEnabled("collabSplits")
        ? collabService.countPendingInvites(producerId)
        : Promise.resolve(0),
    ]);

    const foundingInfo = user?.producerTier === "founding"
      ? {
          producerTier: user.producerTier as "founding",
          platformFeeOverride: user.platformFeeOverride ?? null,
          feePercent: resolvePlatformFeePercent(user),
          producerTierExpiresAt: user.producerTierExpiresAt
            ? new Date(user.producerTierExpiresAt).toISOString()
            : null,
        }
      : null;

    const hasWhatsAppNumber = !!user?.socialLinks?.whatsappNumber;
    const saleWhatsAppEnabled = user?.notificationPrefs?.saleWhatsApp ?? false;
    const showWhatsAppNudge =
      isFeatureEnabled("whatsappSaleAlerts") &&
      hasWhatsAppNumber &&
      !saleWhatsAppEnabled;
    const monthlyData = fillMonthlyRevenue(monthlyRaw, monthCount);

    return {
      totalEarnings,
      totalSales,
      totalPlays: producerBeats.reduce((sum, beat) => sum + beat.plays, 0),
      totalEmbedViews: producerBeats.reduce(
        (sum, beat) => sum + (beat.embedViews ?? 0),
        0
      ),
      username: user?.username ?? null,
      beats: stats,
      monthlyData,
      topBeats,
      foundingInfo,
      showWhatsAppNudge,
      pendingCollabInvites,
    };
  },

  async getSales(producerId: string, page: number, limit: number) {
    const result = await earningRepository.getProducerSales(
      producerId,
      page,
      Math.min(limit, 50)
    );
    return {
      ...result,
      data: result.data.map((row) => toProducerSaleRow(row, producerId)),
    };
  },
};
