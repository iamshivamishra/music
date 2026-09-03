import { beatRepository } from "@/lib/repositories/beat.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { earningRepository } from "@/lib/repositories/earning.repository";
import { beatEventService } from "@/lib/services/beat-event.service";
import { toBeatRepositoryFilters } from "@/lib/services/beat-filters";
import {
  canShareBeat,
  canViewBeat,
  isOwnerOrAdmin,
  type BeatAccessContext,
} from "@/lib/services/beat-access";
import { NotFoundError } from "@/lib/errors";
import type { BeatFilterInput } from "@/lib/validators/beat";
import type { BeatStatus, IBeat, PaginatedResult } from "@/types";

export const beatQueryService = {
  async list(filters: BeatFilterInput): Promise<PaginatedResult<IBeat>> {
    const repoSort =
      filters.sort === "price_asc" || filters.sort === "price_desc"
        ? "newest"
        : filters.sort;

    const repoFilters = await toBeatRepositoryFilters(filters);

    return beatRepository.findWithFilters(
      repoFilters,
      filters.page,
      filters.limit,
      repoSort
    );
  },

  async listByProducer(
    producerId: string,
    status?: BeatStatus,
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<IBeat>> {
    return beatRepository.findByProducerPaginated(
      producerId,
      status,
      page,
      limit
    );
  },

  async listOfferableByProducer(
    producerId: string
  ): Promise<Array<{ id: string; title: string; coverUrl?: string }>> {
    const beats = await beatRepository.findByProducerId(producerId, false);
    return beats
      .filter((beat) => !beat.exclusiveBuyerId)
      .map((beat) => ({
        id: beat._id.toString(),
        title: beat.title,
        coverUrl: beat.coverUrl,
      }));
  },

  async getById(
    id: string,
    includeFullAudio = false
  ): Promise<IBeat> {
    const beat = await beatRepository.findById(
      id,
      includeFullAudio
    );

    if (!beat) {
      throw new NotFoundError("Beat");
    }

    return beat;
  },

  async getProducerEarnings(producerId: string): Promise<number> {
    return earningRepository.sumGrossByProducer(producerId);
  },

  async incrementPlays(id: string, source?: string | null): Promise<void> {
    await beatRepository.incrementPlays(id);
    void beatEventService.record({ beatId: id, kind: "play", source });
  },

  async incrementShareCount(id: string, source?: string | null): Promise<void> {
    const beat = await beatRepository.findById(id);
    if (!beat || !canShareBeat(beat)) {
      throw new NotFoundError("Beat");
    }
    await beatRepository.incrementSharesCount(id);
    void beatEventService.record({ beatId: id, kind: "share", source });
  },

  async getRecent(limit = 8): Promise<IBeat[]> {
    return beatRepository.findRecent(limit);
  },

  async getTrending(limit = 8): Promise<IBeat[]> {
    return beatRepository.findTrending(limit);
  },

  async getProducerStats(producerId: string) {
    const [total, published, drafts, unlisted, scheduled] = await Promise.all([
      beatRepository.countByProducer(producerId),
      beatRepository.countByProducerAndStatus(producerId, "published"),
      beatRepository.countByProducerAndStatus(producerId, "draft"),
      beatRepository.countByProducerAndStatus(producerId, "unlisted"),
      beatRepository.countByProducerAndStatus(producerId, "scheduled"),
    ]);

    return {
      total,
      published,
      drafts,
      unlisted,
      scheduled,
    };
  },

  /**
   * Fetch beat + licenses + purchase status for the public API endpoint.
   * Returns null if beat not found or not visible to the given user.
   */
  async getPublicDetail(
    id: string,
    userId?: string,
    userRole?: string,
    accessToken?: string
  ) {
    const beat = await beatRepository.findById(id);
    if (!beat) throw new NotFoundError("Beat");

    const ctx: BeatAccessContext = { userId, userRole, accessToken };
    if (!canViewBeat(beat, ctx)) {
      throw new NotFoundError("Beat");
    }

    const licenses = await licenseRepository.findByBeatId(id);

    let hasPurchased = false;
    if (userId) {
      hasPurchased = await purchaseRepository.hasPurchased(userId, id);
    }

    const includeToken = isOwnerOrAdmin(beat, ctx);
    return {
      beat: includeToken ? beat : { ...beat, privateToken: undefined },
      licenses,
      hasPurchased,
    };
  },
};
