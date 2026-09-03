import { featuredRepository } from "@/lib/repositories/featured.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { NotFoundError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { isListed } from "@/lib/beat-listing";
import type { FeaturedSection } from "@/types";

export const featuredService = {
  async listWithBeatTitles(): Promise<
    {
      _id: string;
      beatId: string;
      beatTitle: string;
      section: FeaturedSection;
      position: number;
      startDate: string;
      endDate: string;
    }[]
  > {
    const allFeatured = await featuredRepository.findAllSections();

    const beatIds = allFeatured.map((f) => f.beatId.toString());
    const beats =
      beatIds.length > 0 ? await beatRepository.findByIds(beatIds) : [];
    const beatMap = new Map(
      beats.map((b) => [
        (b._id as unknown as { toString(): string }).toString(),
        b,
      ])
    );

    return allFeatured.map((f) => ({
      _id: f._id.toString(),
      beatId: f.beatId.toString(),
      beatTitle: beatMap.get(f.beatId.toString())?.title ?? "Unknown Beat",
      section: f.section,
      position: f.position,
      startDate: f.startDate.toISOString(),
      endDate: f.endDate.toISOString(),
    }));
  },

  async create(
    data: {
      beatId: string;
      section: FeaturedSection;
      position: number;
      startDate: Date;
      endDate: Date;
    },
    adminId: string
  ) {
    const beat = await beatRepository.findById(data.beatId);
    if (!beat || !isListed(beat)) throw new NotFoundError("Beat");

    const entry = await featuredRepository.create({
      beatId: data.beatId,
      section: data.section,
      position: data.position,
      startDate: data.startDate,
      endDate: data.endDate,
      addedBy: adminId,
    });

    audit({
      action: "admin.action",
      userId: adminId,
      resourceType: "featured",
      resourceId: entry._id.toString(),
      metadata: { beatId: data.beatId, section: data.section },
    });

    return entry;
  },

  async delete(id: string, adminId: string): Promise<boolean> {
    const deleted = await featuredRepository.delete(id);

    if (deleted) {
      audit({
        action: "admin.action",
        userId: adminId,
        resourceType: "featured",
        resourceId: id,
        metadata: { action: "delete" },
      });
    }

    return deleted;
  },
};
