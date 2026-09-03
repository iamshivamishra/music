import { beatRepository } from "@/lib/repositories/beat.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { toValidObjectIdOrNull } from "@/lib/security/object-id";
import { NotFoundError } from "@/lib/errors";
import { isListed } from "@/lib/beat-listing";
import { beatEventService } from "@/lib/services/beat-event.service";
import {
  toEmbedBeat,
  toEmbedBeatDetail,
  toEmbedCatalog,
} from "@/lib/serializers/embed";
import type { EmbedBeatDetail, EmbedCatalog } from "@/lib/serializers/embed-types";

const EMBED_CATALOG_MAX = 20;

export const embedService = {
  async getBeatData(beatId: string): Promise<EmbedBeatDetail> {
    if (!toValidObjectIdOrNull(beatId)) throw new NotFoundError("Beat");

    const beat = await beatRepository.findById(beatId);
    if (!beat || !isListed(beat)) throw new NotFoundError("Beat");

    const [producer, cheapestLicense] = await Promise.all([
      userRepository.findById(beat.producerId.toString()),
      licenseRepository.findCheapestForBeat(beat._id.toString()),
    ]);

    return toEmbedBeatDetail(beat, producer, cheapestLicense?.price ?? null);
  },

  async getProducerCatalog(username: string, limit = 10): Promise<EmbedCatalog> {
    const safeLimit = Math.min(Math.max(limit, 1), EMBED_CATALOG_MAX);
    const producer = await userRepository.findByUsername(username);
    if (!producer || producer.role !== "producer") throw new NotFoundError("Producer");

    const beats = await beatRepository.findPublishedByProducer(
      producer._id.toString(),
      safeLimit
    );
    const beatIds = beats.map((b) => b._id.toString());
    const priceMap = await licenseRepository.findCheapestForBeats(beatIds);

    return toEmbedCatalog(
      producer,
      beats.map((beat) => toEmbedBeat(beat, priceMap[beat._id.toString()]?.price))
    );
  },

  async recordView(beatId: string): Promise<void> {
    if (!toValidObjectIdOrNull(beatId)) throw new NotFoundError("Beat");

    const beat = await beatRepository.findById(beatId);
    if (!beat || !isListed(beat)) throw new NotFoundError("Beat");

    await beatRepository.incrementEmbedViews(beatId);
    void beatEventService.recordEmbedView(beatId, beat.producerId.toString());
  },
};
