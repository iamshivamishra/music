import { licenseRepository } from "@/lib/repositories/license.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { ForbiddenError, NotFoundError, ConflictError } from "@/lib/errors";
import { LICENSE_DEFAULTS } from "@/lib/validators/license";
import { logger } from "@/lib/logger";
import type { CreateLicenseInput, UpdateLicenseInput } from "@/lib/validators/license";
import type { ILicense, LicenseType } from "@/types";

async function assertOwnership(beatId: string, userId: string, userRole: string) {
  const beat = await beatRepository.findById(beatId);
  if (!beat) throw new NotFoundError("Beat");
  if (beat.producerId.toString() !== userId && userRole !== "admin") {
    throw new ForbiddenError("You can only manage licenses for your own beats");
  }
  return beat;
}

export const licenseService = {
  async getForBeat(beatId: string, activeOnly = true): Promise<ILicense[]> {
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
    await assertOwnership(input.beatId, userId, userRole);

    const existing = await licenseRepository.findByBeatId(input.beatId, false);
    if (existing.some((l) => l.type === input.type)) {
      throw new ConflictError(`A ${input.type} license already exists for this beat`);
    }

    const defaults = LICENSE_DEFAULTS[input.type as LicenseType];
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
    return updated;
  },

  async delete(
    id: string,
    userId: string,
    userRole: string
  ): Promise<void> {
    const license = await this.getById(id);
    await assertOwnership(license.beatId.toString(), userId, userRole);
    const purchaseCount = await purchaseRepository.countByLicense(id);
    if (purchaseCount > 0) {
      throw new ConflictError("Cannot delete a license that has existing purchases");
    }

    await licenseRepository.delete(id);
    logger.info("License deleted", { licenseId: id });
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
    await licenseRepository.deleteByBeatId(beatId);

    const defaultLicenses = Object.entries(LICENSE_DEFAULTS).map(
      ([type, defaults]) => ({
        beatId: beatId as unknown as ILicense["beatId"],
        type: type as LicenseType,
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

    const created = await licenseRepository.createMany(defaultLicenses);
    logger.info("Licenses reset to defaults", { beatId });
    return created;
  },
};
