import { licenseRepository } from "@/lib/repositories/license.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { withTransaction } from "@/lib/db";
import { ForbiddenError, NotFoundError, ConflictError } from "@/lib/errors";
import { canViewBeat, type BeatAccessContext } from "@/lib/services/beat-access";
import { LICENSE_DEFAULTS, LICENSE_TYPES } from "@/lib/validators/license";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import type { CreateLicenseInput, UpdateLicenseInput } from "@/lib/validators/license";
import type { ILicense } from "@/types";

async function assertOwnership(beatId: string, userId: string, userRole: string) {
  const beat = await beatRepository.findById(beatId);
  if (!beat) throw new NotFoundError("Beat");
  if (beat.producerId.toString() !== userId && userRole !== "admin") {
    throw new ForbiddenError("You can only manage licenses for your own beats");
  }
  return beat;
}

export const licenseService = {
  async getForBeat(
    beatId: string,
    activeOnly = true,
    access?: BeatAccessContext
  ): Promise<ILicense[]> {
    const beat = await beatRepository.findById(beatId);
    if (!beat) throw new NotFoundError("Beat");
    if (!canViewBeat(beat, access ?? {})) {
      throw new NotFoundError("Beat");
    }
    return licenseRepository.findByBeatId(beatId, activeOnly);
  },

  async getById(id: string): Promise<ILicense> {
    const license = await licenseRepository.findById(id);
    if (!license) throw new NotFoundError("License");
    return license;
  },

  async create(
    input: CreateLicenseInput,
    userId: string,
    userRole: string
  ): Promise<ILicense> {
    const beat = await assertOwnership(input.beatId, userId, userRole);

    if (input.type === "exclusive" && beat.exclusiveBuyerId) {
      throw new ConflictError("Cannot create an exclusive license for a beat that has already been exclusively sold");
    }

    const existing = await licenseRepository.findByBeatId(input.beatId, false);
    if (existing.some((l) => l.type === input.type)) {
      throw new ConflictError(`A ${input.type} license already exists for this beat`);
    }

    const defaults = LICENSE_DEFAULTS[input.type as (typeof LICENSE_TYPES)[number]];
    const name = input.name || defaults.name;

    const license = await licenseRepository.create({
      beatId: input.beatId as unknown as ILicense["beatId"],
      type: input.type,
      name,
      price: input.price,
      streamLimit: input.streamLimit ?? defaults.streamLimit,
      includesWav: input.includesWav ?? defaults.includesWav,
      includesStems: input.includesStems ?? defaults.includesStems,
      commercialUse: input.commercialUse ?? defaults.commercialUse,
      terms: input.terms,
      isActive: true,
    });

    logger.info("License created", { licenseId: license._id, beatId: input.beatId });
    audit({ action: "license.create", userId, resourceType: "license", resourceId: license._id.toString(), metadata: { beatId: input.beatId, type: input.type } });
    return license;
  },

  async update(
    id: string,
    input: UpdateLicenseInput,
    userId: string,
    userRole: string
  ): Promise<ILicense> {
    const license = await this.getById(id);
    await assertOwnership(license.beatId.toString(), userId, userRole);

    const updated = await licenseRepository.update(id, input);
    if (!updated) throw new NotFoundError("License");

    logger.info("License updated", { licenseId: id });
    audit({ action: "license.update", userId, resourceType: "license", resourceId: id, metadata: { fields: Object.keys(input) } });
    return updated;
  },

  async delete(
    id: string,
    userId: string,
    userRole: string
  ): Promise<void> {
    const license = await this.getById(id);
    const beat = await assertOwnership(license.beatId.toString(), userId, userRole);

    if (license.type === "exclusive" && beat.exclusiveBuyerId) {
      throw new ConflictError("Cannot delete an exclusive license after the beat has been exclusively sold");
    }

    const purchaseCount = await purchaseRepository.countByLicense(id);
    if (purchaseCount > 0) {
      throw new ConflictError("Cannot delete a license that has existing purchases");
    }

    await licenseRepository.delete(id);
    logger.info("License deleted", { licenseId: id });
    audit({ action: "license.delete", userId, resourceType: "license", resourceId: id, metadata: { beatId: license.beatId.toString(), type: license.type } });
  },

  async resetToDefaults(
    beatId: string,
    userId: string,
    userRole: string
  ): Promise<ILicense[]> {
    await assertOwnership(beatId, userId, userRole);
    const purchaseCount = await purchaseRepository.countByBeat(beatId);
    if (purchaseCount > 0) {
      throw new ConflictError("Cannot reset licenses for a beat with existing purchases");
    }
    const defaultLicenses = Object.entries(LICENSE_DEFAULTS)
      .filter(([type]) => type !== "exclusive")
      .map(([type, defaults]) => ({
        beatId: beatId as unknown as ILicense["beatId"],
        type: type as (typeof LICENSE_TYPES)[number],
        name: defaults.name,
        price: defaults.price,
        streamLimit: defaults.streamLimit,
        includesWav: defaults.includesWav,
        includesStems: defaults.includesStems,
        commercialUse: defaults.commercialUse,
        terms: defaults.terms,
        isActive: true,
      })
    );

    const created = await withTransaction(async (session) => {
      await licenseRepository.deleteByBeatId(beatId, { session });
      return licenseRepository.createMany(defaultLicenses, { session });
    });

    logger.info("Licenses reset to defaults", { beatId });
    audit({ action: "license.reset_defaults", userId, resourceType: "beat", resourceId: beatId });
    return created;
  },
};
