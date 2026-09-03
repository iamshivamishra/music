import { toBeatRepositoryFilters } from "@/lib/services/beat-filters";
import { presignService } from "@/lib/services/presign.service";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { toMarketplaceBeat, type MarketplaceBeat } from "@/lib/serializers/marketplace-beat";
import { logger } from "@/lib/logger";
import type { BeatFilterInput } from "@/lib/validators/beat";
import type { IBeat, IUser } from "@/types";

const PRICE_SCAN_CAP = 500;
const PRICE_SORTS = new Set(["price_asc", "price_desc"]);

function isPriceSort(sort: BeatFilterInput["sort"]): boolean {
  return PRICE_SORTS.has(sort);
}

function dbSortForScan(sort: BeatFilterInput["sort"]): "newest" | "popular" | "most_sold" {
  if (sort === "popular" || sort === "most_sold") return sort;
  return "newest";
}

function toProducerMap(producers: IUser[]) {
  return new Map(
    producers.map((producer) => [
      producer._id.toString(),
      {
        displayName: producer.displayName,
        name: producer.name,
        username: producer.username,
        producerTier: producer.producerTier,
      },
    ])
  );
}

function inPriceRange(beat: MarketplaceBeat, filters: BeatFilterInput): boolean {
  if (beat.startingPrice === null) return false;
  if (filters.priceMin !== undefined && beat.startingPrice < filters.priceMin) return false;
  if (filters.priceMax !== undefined && beat.startingPrice > filters.priceMax) return false;
  return true;
}

function sortByStartingPrice(beats: MarketplaceBeat[], direction: "price_asc" | "price_desc") {
  const sign = direction === "price_asc" ? 1 : -1;
  return [...beats].sort((a, b) => {
    if (a.startingPrice === null && b.startingPrice === null) return 0;
    if (a.startingPrice === null) return 1;
    if (b.startingPrice === null) return -1;
    return (a.startingPrice - b.startingPrice) * sign;
  });
}

async function attachProducersAndPrices(beats: IBeat[]): Promise<MarketplaceBeat[]> {
  const beatIds = beats.map((beat) => beat._id.toString());
  const producerIds = [...new Set(beats.map((beat) => beat.producerId.toString()))];

  const [producers, cheapestByBeatId] = await Promise.all([
    userRepository.findByIds(producerIds),
    licenseRepository.findCheapestForBeats(beatIds),
  ]);

  const producerMap = toProducerMap(producers);

  return beats.map((beat) => {
    const beatId = beat._id.toString();
    const producer = producerMap.get(beat.producerId.toString());
    return toMarketplaceBeat(beat, producer, cheapestByBeatId[beatId]);
  });
}

function paginateAndPresign(beats: MarketplaceBeat[], page: number, limit: number) {
  const total = beats.length;
  const skip = (page - 1) * limit;
  const paginatedBeats = beats.slice(skip, skip + limit);
  const totalPages = Math.max(1, Math.ceil(total / limit));

  return presignService.withPresignedBeatCovers(paginatedBeats).then((presignedBeats) => ({
    beats: presignedBeats,
    total,
    page,
    limit,
    totalPages,
    hasNext: skip + limit < total,
  }));
}

async function listWithPriceJoin(filters: BeatFilterInput, hasPriceFilter: boolean) {
  const repoFilters = await toBeatRepositoryFilters(filters);
  const scan = await beatRepository.findWithFilters(
    repoFilters,
    1,
    PRICE_SCAN_CAP,
    dbSortForScan(filters.sort)
  );

  if (scan.total > PRICE_SCAN_CAP) {
    logger.warn("Marketplace price scan hit cap; consider denormalizing startingPrice", {
      scanned: PRICE_SCAN_CAP,
      totalMatching: scan.total,
    });
  }

  let beats = await attachProducersAndPrices(scan.data);

  if (hasPriceFilter) {
    beats = beats.filter((beat) => inPriceRange(beat, filters));
  }

  if (filters.sort === "price_asc" || filters.sort === "price_desc") {
    beats = sortByStartingPrice(beats, filters.sort);
  }

  return paginateAndPresign(beats, filters.page, filters.limit);
}

async function listStandard(filters: BeatFilterInput) {
  const sort = filters.sort === "price_asc" || filters.sort === "price_desc"
    ? "newest" as const
    : filters.sort;

  const repoFilters = await toBeatRepositoryFilters(filters);
  const result = await beatRepository.findWithFilters(
    repoFilters,
    filters.page,
    filters.limit,
    sort
  );

  const beats = await attachProducersAndPrices(result.data);
  const presignedBeats = await presignService.withPresignedBeatCovers(beats);

  return {
    beats: presignedBeats,
    total: result.total,
    page: result.page,
    limit: filters.limit,
    totalPages: Math.max(1, Math.ceil(result.total / filters.limit)),
    hasNext: result.hasNext,
  };
}

export const marketplaceService = {
  async list(filters: BeatFilterInput) {
    const hasPriceFilter =
      filters.priceMin !== undefined || filters.priceMax !== undefined;

    if (hasPriceFilter || isPriceSort(filters.sort)) {
      return listWithPriceJoin(filters, hasPriceFilter);
    }

    return listStandard(filters);
  },

  async getHomepageStats() {
    const [beatCount, producerCount, genreCount] = await Promise.all([
      beatRepository.countPublished(),
      userRepository.countByRole("producer"),
      beatRepository.countDistinctGenres(),
    ]);
    return { beatCount, producerCount, genreCount };
  },
};
