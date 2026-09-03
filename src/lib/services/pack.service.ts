import { packRepository } from "@/lib/repositories/pack.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { ConflictError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { isListed } from "@/lib/beat-listing";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import type { CreatePackInput, UpdatePackInput, PackFilterInput } from "@/lib/validators/pack";
import type { IBeat, IBeatPack, PaginatedResult } from "@/types";

function assertPackBeatsListed(beats: IBeat[]) {
  for (const beat of beats) {
    if (!isListed(beat)) {
      throw new ConflictError(
        `"${beat.title}" must be published before it can be added to a pack`
      );
    }
  }
}

export const packService = {
  async create(input: CreatePackInput, producerId: string): Promise<IBeatPack> {
    const slugTaken = await packRepository.slugExists(input.slug);
    if (slugTaken) throw new ConflictError("A pack with this slug already exists");

    if (input.beats.length > 0) {
      const beatIds = input.beats.map((b) => b.beatId);
      const beats = await beatRepository.findByIds(beatIds, true);
      const foundIds = new Set(beats.map((b) => b._id.toString()));
      for (const id of beatIds) {
        if (!foundIds.has(id)) throw new NotFoundError(`Beat ${id}`);
      }
      for (const beat of beats) {
        if (beat.producerId.toString() !== producerId) {
          throw new ForbiddenError("You can only add your own beats to a pack");
        }
      }
      assertPackBeatsListed(beats);
    }

    const status = input.status || "draft";
    const isPublished = status === "published";

    const pack = await packRepository.create({
      ...input,
      producerId: producerId as unknown as IBeatPack["producerId"],
      status,
      isPublished,
      salesCount: 0,
    });

    logger.info("Pack created", { packId: pack._id, producerId, status });
    audit({ action: "pack.create", userId: producerId, resourceType: "pack", resourceId: pack._id.toString() });

    return pack;
  },

  async list(filters: PackFilterInput): Promise<PaginatedResult<IBeatPack>> {
    return packRepository.findWithFilters(
      {
        genre: filters.genre,
        search: filters.search,
        producerId: filters.producerId,
        isPublished: true,
      },
      filters.page,
      filters.limit,
      filters.sort
    );
  },

  async listByProducer(
    producerId: string,
    status?: IBeatPack["status"],
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<IBeatPack>> {
    return packRepository.findByProducerPaginated(producerId, status, page, limit);
  },

  async getBySlug(slug: string): Promise<IBeatPack> {
    const pack = await packRepository.findBySlug(slug);
    if (!pack) throw new NotFoundError("Beat Pack");
    return pack;
  },

  async getById(id: string): Promise<IBeatPack> {
    const pack = await packRepository.findById(id);
    if (!pack) throw new NotFoundError("Beat Pack");
    return pack;
  },

  async update(
    id: string,
    userId: string,
    userRole: string,
    data: UpdatePackInput
  ): Promise<IBeatPack> {
    const pack = await this.getById(id);

    if (pack.producerId.toString() !== userId && userRole !== "admin") {
      throw new ForbiddenError("You can only edit your own packs");
    }

    if (data.slug && data.slug !== pack.slug) {
      const slugTaken = await packRepository.slugExists(data.slug, id);
      if (slugTaken) throw new ConflictError("A pack with this slug already exists");
    }

    if (data.beats && data.beats.length > 0) {
      const beatIds = data.beats.map((b) => b.beatId);
      const beats = await beatRepository.findByIds(beatIds, true);
      const foundIds = new Set(beats.map((b) => b._id.toString()));
      for (const bid of beatIds) {
        if (!foundIds.has(bid)) throw new NotFoundError(`Beat ${bid}`);
      }
      for (const beat of beats) {
        if (beat.producerId.toString() !== pack.producerId.toString() && userRole !== "admin") {
          throw new ForbiddenError("Pack can only contain the producer's own beats");
        }
      }
      assertPackBeatsListed(beats);
    }

    if (data.status === "published" && (!data.beats || data.beats.length === 0)) {
      const memberIds = pack.beats.map((b) => b.beatId.toString());
      const members = await beatRepository.findByIds(memberIds, true);
      assertPackBeatsListed(members);
    }

    const { isPublished: _clientIsPublished, ...safeData } = data;
    const updateData: Partial<IBeatPack> = { ...safeData } as Partial<IBeatPack>;
    if (safeData.status !== undefined) {
      updateData.isPublished = safeData.status === "published";
    }

    const updated = await packRepository.update(id, updateData);
    if (!updated) throw new NotFoundError("Beat Pack");

    logger.info("Pack updated", { packId: id, status: safeData.status });
    audit({ action: "pack.update", userId, resourceType: "pack", resourceId: id });

    return updated;
  },

  async publish(id: string, userId: string, userRole: string): Promise<IBeatPack> {
    const result = await this.update(id, userId, userRole, { status: "published" });
    audit({ action: "pack.publish", userId, resourceType: "pack", resourceId: id });
    return result;
  },

  async unpublish(id: string, userId: string, userRole: string): Promise<IBeatPack> {
    const result = await this.update(id, userId, userRole, { status: "draft" });
    audit({ action: "pack.unpublish", userId, resourceType: "pack", resourceId: id });
    return result;
  },

  async archive(id: string, userId: string, userRole: string): Promise<IBeatPack> {
    return this.update(id, userId, userRole, { status: "archived" });
  },

  /**
   * Fetch all data needed for the pack detail page.
   */
  async getDetailPageData(slug: string, userId?: string, userRole?: string) {
    const pack = await packRepository.findBySlug(slug);
    if (!pack) throw new NotFoundError("Beat Pack");

    if (!pack.isPublished && pack.status !== "published") {
      const isOwner = userId === pack.producerId.toString();
      if (!isOwner && userRole !== "admin") throw new NotFoundError("Beat Pack");
    }

    const beatIds = pack.beats
      .sort((a, b) => a.position - b.position)
      .map((b) => b.beatId.toString());

    const [beats, producer] = await Promise.all([
      beatRepository.findByIds(beatIds),
      userRepository.findById(pack.producerId.toString()),
    ]);

    const beatMap = new Map(beats.map((b) => [b._id.toString(), b]));
    const orderedBeats = beatIds
      .map((id) => beatMap.get(id))
      .filter((beat): beat is IBeat => beat != null)
      .filter(isListed);

    const hasPurchased = userId
      ? await purchaseRepository.hasPackPurchase(userId, pack._id.toString())
      : false;

    const existingPurchase = userId && hasPurchased
      ? await purchaseRepository.findPackPurchase(userId, pack._id.toString())
      : null;

    const producerName = producer?.displayName || producer?.name || "Unknown";

    return { pack, orderedBeats, producer, producerName, hasPurchased, existingPurchase };
  },

  /**
   * Fetch pack metadata for SEO.
   */
  async getMetadata(slug: string) {
    const pack = await packRepository.findBySlug(slug);
    if (!pack) return null;
    const producer = await userRepository.findById(pack.producerId.toString());
    const producerName = producer?.displayName || producer?.name || "Unknown";
    return { pack, producerName };
  },

  /**
   * List packs with producer names resolved.
   */
  async listWithProducers(filters: PackFilterInput) {
    const result = await this.list(filters);

    const producerIds = [...new Set(result.data.map((p) => p.producerId.toString()))];
    const producers = await userRepository.findByIds(producerIds);
    const producerMap = new Map(
      producers.map((p) => [p._id.toString(), p])
    );

    return { result, producerMap };
  },

  async delete(id: string, userId: string, userRole: string): Promise<void> {
    const pack = await this.getById(id);

    if (pack.producerId.toString() !== userId && userRole !== "admin") {
      throw new ForbiddenError("You can only delete your own packs");
    }

    await packRepository.delete(id);

    logger.info("Pack deleted", { packId: id, deletedBy: userId });
    audit({ action: "pack.delete", userId, resourceType: "pack", resourceId: id });
  },
};
