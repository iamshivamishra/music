import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { storageService } from "@/lib/services/storage.service";
import { logger } from "@/lib/logger";
import {
  toLibraryItems,
  type LibraryResult,
} from "@/lib/serializers/library";

function emptyResult(page: number, limit: number): LibraryResult {
  return {
    data: [],
    total: 0,
    page,
    limit,
    totalPages: 0,
    hasNext: false,
    hasPrev: false,
  };
}

export const libraryService = {
  async getLibrary(
    userId: string,
    page: number,
    limit: number,
    search?: string
  ): Promise<LibraryResult> {
    const trimmedSearch = search?.trim();
    let titleMatchIds: string[] | undefined;

    if (trimmedSearch) {
      titleMatchIds = await beatRepository.findIdsByTitle(trimmedSearch);
      if (titleMatchIds.length === 0) {
        return emptyResult(page, limit);
      }
    }

    const result = await purchaseRepository.findByBuyerIdPaginated(userId, {
      page,
      limit,
      type: "beat",
      beatIds: titleMatchIds,
    });

    const beatIds = [
      ...new Set(
        result.data.filter((p) => p.beatId).map((p) => p.beatId!.toString())
      ),
    ];
    const beats =
      beatIds.length > 0 ? await beatRepository.findByIds(beatIds) : [];
    const beatMap = new Map(beats.map((b) => [b._id.toString(), b]));

    const producerIds = [
      ...new Set(beats.map((b) => b.producerId.toString())),
    ];
    const producers =
      producerIds.length > 0
        ? await userRepository.findByIds(producerIds)
        : [];
    const producerMap = new Map(producers.map((p) => [p._id.toString(), p]));

    const coverUrlMap = new Map<string, string>();
    await Promise.all(
      beats.map(async (b) => {
        if (!b.coverUrl) return;
        try {
          const url = await storageService.presignCoverUrl(b.coverUrl);
          coverUrlMap.set(b._id.toString(), url);
        } catch (err) {
          logger.warn("Failed to presign cover URL", {
            beatId: b._id,
            err,
          });
        }
      })
    );

    const items = toLibraryItems(
      result.data,
      beatMap,
      producerMap,
      coverUrlMap
    );

    return {
      data: items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
      hasNext: result.hasNext,
      hasPrev: result.hasPrev,
    };
  },
};
