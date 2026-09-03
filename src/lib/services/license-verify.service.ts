import crypto from "crypto";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { packRepository } from "@/lib/repositories/pack.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";

const HMAC_SECRET = process.env.HMAC_LICENSE_SECRET || process.env.AUTH_SECRET;

function getSecret(): string {
  if (!HMAC_SECRET) {
    throw new Error("HMAC_LICENSE_SECRET or AUTH_SECRET must be set");
  }
  return HMAC_SECRET;
}

function computeHmac(data: string): string {
  return crypto.createHmac("sha256", getSecret()).update(data).digest("hex");
}

export interface LicenseCertificate {
  licenseNumber: string;
  purchaseId: string;
  buyerName: string;
  buyerEmail: string;
  itemTitle: string;
  itemType: "beat" | "pack";
  licenseType: string;
  purchaseDate: string;
  amount: number;
  includesWav: boolean;
  includesStems: boolean;
  valid: boolean;
}

export const licenseVerifyService = {
  generateLicenseNumber(purchaseId: string): string {
    const payload = `license:${purchaseId}`;
    const hmac = computeHmac(payload);
    const short = hmac.slice(0, 12).toUpperCase();
    return `TBL-${short.slice(0, 4)}-${short.slice(4, 8)}-${short.slice(8, 12)}`;
  },

  verifyLicenseNumber(purchaseId: string, licenseNumber: string): boolean {
    const expected = this.generateLicenseNumber(purchaseId);
    return expected === licenseNumber;
  },

  async getCertificate(purchaseId: string): Promise<LicenseCertificate> {
    const purchase = await purchaseRepository.findById(purchaseId);
    if (!purchase) throw new NotFoundError("Purchase");

    if (!purchase.buyerId) throw new NotFoundError("Buyer");
    const buyer = await userRepository.findById(purchase.buyerId.toString());
    if (!buyer) throw new NotFoundError("Buyer");

    const licenseNumber = this.generateLicenseNumber(purchaseId);
    let itemTitle = "Unknown";
    let itemType: "beat" | "pack" = "beat";

    if (purchase.packId) {
      itemType = "pack";
      const pack = await packRepository.findById(purchase.packId.toString());
      itemTitle = pack?.title || "Unknown Pack";
    } else if (purchase.beatId) {
      const beat = await beatRepository.findById(purchase.beatId.toString());
      itemTitle = beat?.title || "Unknown Beat";
    }

    return {
      licenseNumber,
      purchaseId,
      buyerName: buyer.displayName || buyer.name,
      buyerEmail: buyer.email,
      itemTitle,
      itemType,
      licenseType: purchase.packTier || purchase.licenseType || "basic",
      purchaseDate: new Date(purchase.createdAt).toISOString(),
      amount: purchase.amount,
      includesWav: purchase.includesWav ?? false,
      includesStems: purchase.includesStems ?? false,
      valid: true,
    };
  },

  async verifyByLicenseNumber(
    licenseNumber: string
  ): Promise<LicenseCertificate | null> {
    // O(1) lookup via persisted license number
    const directMatch = await purchaseRepository.findByLicenseNumber(licenseNumber);
    if (directMatch) {
      try {
        return await this.getCertificate(directMatch._id.toString());
      } catch {
        return null;
      }
    }

    // HMAC fallback for purchases created before license numbers were persisted.
    // Process in batches to avoid loading all purchase IDs into memory at once.
    const BATCH_SIZE = 500;
    let skip = 0;
    let hasMore = true;
    while (hasMore) {
      const batch = await purchaseRepository.findIdsPaginated(skip, BATCH_SIZE);
      for (const id of batch) {
        if (this.generateLicenseNumber(id) === licenseNumber) {
          try {
            await purchaseRepository.updateLicenseFields(id, { licenseNumber });
            return await this.getCertificate(id);
          } catch {
            return null;
          }
        }
      }
      hasMore = batch.length === BATCH_SIZE;
      skip += BATCH_SIZE;
    }

    logger.warn("License verification failed - not found", { licenseNumber });
    return null;
  },

  async verifyByHash(hash: string): Promise<LicenseCertificate | null> {
    const purchase = await purchaseRepository.findByVerificationHash(hash);
    if (!purchase) return null;
    try {
      return await this.getCertificate(purchase._id.toString());
    } catch {
      return null;
    }
  },
};
