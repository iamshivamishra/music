import { userRepository } from "@/lib/repositories/user.repository";
import type { BeatFilterInput } from "@/lib/validators/beat";
import type { BeatFilters } from "@/types";

/**
 * Convert API filter input to repository-level filters.
 * Resolves the `producer` name/username search into `producerIds`
 * so the repository never touches the User collection.
 */
export async function toBeatRepositoryFilters(filters: BeatFilterInput): Promise<BeatFilters> {
  let producerIds: string[] | undefined;

  if (filters.producer) {
    producerIds = await userRepository.findProducerIdsBySearch(filters.producer);
    if (producerIds.length === 0) {
      // No matching producers — caller will get empty results
      producerIds = ["__no_match__"];
    }
  }

  return {
    genre: filters.genre,
    key: filters.key,
    mood: filters.mood,
    search: filters.search,
    producerId: filters.producerId,
    producerIds,
    bpm:
      filters.bpmMin !== undefined || filters.bpmMax !== undefined
        ? {
            min: filters.bpmMin,
            max: filters.bpmMax,
          }
        : undefined,
    tags: filters.tags ? filters.tags.split(",") : undefined,
    isPublished: true,
  };
}
