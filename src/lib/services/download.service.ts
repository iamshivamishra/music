import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { packRepository } from "@/lib/repositories/pack.repository";
import { storageService } from "@/lib/services/storage.service";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import { resolvePurchaseEntitlements } from "@/lib/security/entitlements";
import type { IBeat, IPurchase } from "@/types";
import {
  type DownloadFileType,
  type DownloadLinkDto as DownloadLink,
  type GuestDownloadItemDto,
} from "@/lib/serializers/download";

export const TAGGED_PREVIEW_TTL_SECONDS = 3600;

export type { DownloadFileType, DownloadLink };

interface DownloadAccess {
  beatId: string;
  beatTitle: string;
  coverUrl?: string;
  purchaseId: string;
  licenseType: string;
  licenseName: string;
  expiresInSeconds: number;
  links: DownloadLink[];
}

function buildFilename(title: string, type: DownloadFileType): string {
  const sanitized = title.replace(/[^a-zA-Z0-9 _-]/g, "").trim();
  switch (type) {
    case "preview":
      return `${sanitized} - Preview.mp3`;
    case "master":
      return `${sanitized}.wav`;
    case "stems":
      return `${sanitized} - Stems.zip`;
  }
}

function resolveFileUrl(beat: IBeat, type: DownloadFileType): string | null {
  switch (type) {
    case "preview":
      return beat.audioTaggedUrl || null;
    case "master":
      return beat.audioFullUrl || null;
    case "stems":
      return beat.stemsUrl || null;
  }
}

function resolveStorageKey(beat: IBeat, type: DownloadFileType): string | null {
  const storageKeys = beat.storageKeys;
  switch (type) {
    case "preview":
      return storageKeys?.preview || null;
    case "master":
      return storageKeys?.master || null;
    case "stems":
      return storageKeys?.stems || null;
  }
}

async function generateSignedUrl(
  beat: IBeat,
  fileType: DownloadFileType
): Promise<string> {
  const value =
    resolveStorageKey(beat, fileType) ?? resolveFileUrl(beat, fileType);
  if (!value) {
    throw new NotFoundError(`${fileType} file not available for this beat`);
  }

  return storageService.getDownloadUrlForValue(value, {
    expiresInSeconds: storageService.SIGNED_URL_TTL_SECONDS,
  });
}

/**
 * Resolve entitlements for a purchase, checking the license if purchase
 * flags are missing. This is the single source of truth for WAV/stems
 * access across both PDP and library download paths.
 */
async function resolveEntitlements(
  purchase: IPurchase,
  beatId: string
): Promise<{ wavAllowed: boolean; stemsAllowed: boolean }> {
  const license = purchase.licenseId
    ? await licenseRepository.findById(purchase.licenseId.toString())
    : null;
  const { wavAllowed, stemsAllowed } = resolvePurchaseEntitlements(
    purchase,
    license,
    beatId
  );
  return { wavAllowed, stemsAllowed };
}

async function buildEntitledLinks(
  beat: IBeat,
  wavAllowed: boolean,
  stemsAllowed: boolean
): Promise<DownloadLink[]> {
  const links: DownloadLink[] = [];

  const previewUrl = resolveFileUrl(beat, "preview");
  if (previewUrl) {
    const filename = buildFilename(beat.title, "preview");
    links.push({
      type: "preview",
      label: "MP3 Preview",
      url: await generateSignedUrl(beat, "preview"),
      filename,
      available: true,
    });
  }

  const masterUrl = resolveFileUrl(beat, "master");
  if (masterUrl && wavAllowed) {
    const filename = buildFilename(beat.title, "master");
    links.push({
      type: "master",
      label: "WAV Master",
      url: await generateSignedUrl(beat, "master"),
      filename,
      available: true,
    });
  } else if (!wavAllowed) {
    links.push({
      type: "master",
      label: "WAV Master",
      url: "",
      filename: "",
      available: false,
      reason: "Upgrade your license to access WAV files",
    });
  }

  const stemsUrl = resolveFileUrl(beat, "stems");
  if (stemsUrl && stemsAllowed) {
    const filename = buildFilename(beat.title, "stems");
    links.push({
      type: "stems",
      label: "Stems Package",
      url: await generateSignedUrl(beat, "stems"),
      filename,
      available: true,
    });
  } else if (stemsUrl && !stemsAllowed) {
    links.push({
      type: "stems",
      label: "Stems Package",
      url: "",
      filename: "",
      available: false,
      reason: "Upgrade to Unlimited license for stems access",
    });
  } else if (!stemsUrl) {
    links.push({
      type: "stems",
      label: "Stems Package",
      url: "",
      filename: "",
      available: false,
      reason: "Stems not provided for this beat",
    });
  }

  return links;
}

/**
 * Core signing logic shared by both beat-id and purchase-id download paths.
 * Validates entitlements, generates a signed URL, and audits.
 */
async function signForPurchase(
  purchase: IPurchase,
  beat: IBeat,
  userId: string,
  fileType: DownloadFileType,
  auditResourceType: "beat" | "purchase"
): Promise<{ url: string; filename: string }> {
  const beatId = beat._id.toString();
  const { wavAllowed, stemsAllowed } = await resolveEntitlements(
    purchase,
    beatId
  );

  if (fileType === "master" && !wavAllowed) {
    throw new ForbiddenError(
      "Your license does not include WAV files. Upgrade to access."
    );
  }

  if (fileType === "stems" && !stemsAllowed) {
    throw new ForbiddenError(
      "Your license does not include stems. Upgrade to Unlimited."
    );
  }

  const fileUrl = resolveFileUrl(beat, fileType);
  if (!fileUrl)
    throw new NotFoundError(`${fileType} file not available for this beat`);

  const filename = buildFilename(beat.title, fileType);
  const url = await generateSignedUrl(beat, fileType);

  logger.info("Signed download URL generated", {
    userId,
    beatId,
    purchaseId: purchase._id.toString(),
    fileType,
    beatStatus: beat.status,
  });
  audit({
    action: "download.signed_url",
    userId,
    resourceType: auditResourceType,
    resourceId:
      auditResourceType === "purchase"
        ? purchase._id.toString()
        : beatId,
    metadata: { fileType, beatId },
  });

  return { url, filename };
}

export const downloadService = {
  /**
   * Get all available download links for a purchased beat.
   * Validates ownership and checks license entitlements.
   */
  async getDownloadLinks(
    userId: string,
    beatId: string
  ): Promise<DownloadAccess> {
    const hasPurchased = await purchaseRepository.hasPurchased(userId, beatId);
    if (!hasPurchased) {
      throw new ForbiddenError("You must purchase this beat to download it");
    }

    const beat = await beatRepository.findById(beatId, true);
    if (!beat) throw new NotFoundError("Beat");

    const purchases = await purchaseRepository.findByBuyerAndBeat(
      userId,
      beatId
    );
    if (purchases.length === 0) throw new ForbiddenError("No purchase found");

    const purchase = purchases[0];
    const { wavAllowed, stemsAllowed } = await resolveEntitlements(
      purchase,
      beatId
    );

    const links = await buildEntitledLinks(beat, wavAllowed, stemsAllowed);

    const licenseMatchesBeat =
      !!purchase.licenseId &&
      (await (async () => {
        const license = await licenseRepository.findById(
          purchase.licenseId!.toString()
        );
        return (
          !!license &&
          license.beatId.toString() === beatId &&
          license.isActive
        );
      })());

    const licenseName = licenseMatchesBeat
      ? ((
          await licenseRepository.findById(purchase.licenseId!.toString())
        )?.name ??
        purchase.licenseType ??
        "unknown")
      : (purchase.licenseType ?? "unknown");

    logger.info("Download links generated", {
      userId,
      beatId,
      wavAllowed,
      stemsAllowed,
      linksCount: links.filter((l) => l.available).length,
    });
    audit({
      action: "download.links_generated",
      userId,
      resourceType: "beat",
      resourceId: beatId,
      metadata: { wavAllowed, stemsAllowed },
    });

    return {
      beatId: beat._id.toString(),
      beatTitle: beat.title,
      coverUrl: beat.coverUrl,
      purchaseId: purchase._id.toString(),
      licenseType: purchase.licenseType ?? "unknown",
      licenseName,
      expiresInSeconds: storageService.SIGNED_URL_TTL_SECONDS,
      links,
    };
  },

  /**
   * Generate a single signed download URL by beat ID.
   * Used for direct download redirects from the beat PDP.
   */
  async getSignedUrl(
    userId: string,
    beatId: string,
    fileType: DownloadFileType
  ): Promise<{ url: string; filename: string }> {
    const hasPurchased = await purchaseRepository.hasPurchased(userId, beatId);
    if (!hasPurchased) {
      throw new ForbiddenError("You must purchase this beat to download it");
    }

    const beat = await beatRepository.findById(beatId, true);
    if (!beat) throw new NotFoundError("Beat");

    const purchases = await purchaseRepository.findByBuyerAndBeat(
      userId,
      beatId
    );
    if (purchases.length === 0) throw new ForbiddenError("No purchase found");

    return signForPurchase(purchases[0], beat, userId, fileType, "beat");
  },

  /**
   * Generate a signed download URL from a purchase the buyer owns.
   * Works for archived / exclusively sold beats as long as the beat document remains.
   */
  async getSignedUrlByPurchase(
    purchaseId: string,
    userId: string,
    fileType: DownloadFileType
  ): Promise<{ url: string; filename: string }> {
    const purchase = await purchaseRepository.findByIdAndBuyer(
      purchaseId,
      userId
    );
    if (!purchase) throw new NotFoundError("Purchase");
    if (!purchase.beatId) throw new NotFoundError("Beat for purchase");

    const beatId = purchase.beatId.toString();
    const beat = await beatRepository.findById(beatId, true);
    if (!beat) {
      throw new NotFoundError("Beat files for this purchase");
    }

    return signForPurchase(purchase, beat, userId, fileType, "purchase");
  },

  async getPackDownloadLinks(
    userId: string,
    packId: string
  ): Promise<{
    packId: string;
    packTitle: string;
    packTier: string;
    beats: {
      beatId: string;
      beatTitle: string;
      previewUrl: string | null;
      masterUrl: string | null;
      stemsUrl: string | null;
    }[];
  }> {
    const purchase = await purchaseRepository.findPackPurchase(userId, packId);
    if (!purchase) {
      throw new ForbiddenError("You must purchase this pack to download it");
    }

    const pack = await packRepository.findById(packId);
    if (!pack) throw new NotFoundError("Beat Pack");

    const wavAllowed = purchase.includesWav ?? false;
    const stemsAllowed = purchase.includesStems ?? false;

    const beatIds = pack.beats.map((b) => b.beatId.toString());
    const beats = await beatRepository.findByIds(beatIds, true);

    const beatDownloads = await Promise.all(
      beats.map(async (beat) => {
        let previewUrl: string | null = null;
        let masterUrl: string | null = null;
        let stemsUrlVal: string | null = null;

        try {
          if (resolveFileUrl(beat, "preview")) {
            previewUrl = await generateSignedUrl(beat, "preview");
          }
        } catch (err) {
          logger.warn("Failed to sign preview URL for pack beat", {
            beatId: beat._id,
            err,
          });
        }

        try {
          if (wavAllowed && resolveFileUrl(beat, "master")) {
            masterUrl = await generateSignedUrl(beat, "master");
          }
        } catch (err) {
          logger.warn("Failed to sign master URL for pack beat", {
            beatId: beat._id,
            err,
          });
        }

        try {
          if (stemsAllowed && resolveFileUrl(beat, "stems")) {
            stemsUrlVal = await generateSignedUrl(beat, "stems");
          }
        } catch (err) {
          logger.warn("Failed to sign stems URL for pack beat", {
            beatId: beat._id,
            err,
          });
        }

        return {
          beatId: beat._id.toString(),
          beatTitle: beat.title,
          previewUrl,
          masterUrl,
          stemsUrl: stemsUrlVal,
        };
      })
    );

    logger.info("Pack download links generated", {
      userId,
      packId,
      beatCount: beatDownloads.length,
    });
    audit({
      action: "download.links_generated",
      userId,
      resourceType: "pack",
      resourceId: packId,
    });

    return {
      packId: pack._id.toString(),
      packTitle: pack.title,
      packTier: purchase.packTier || "basic",
      beats: beatDownloads,
    };
  },

  async getGuestDownloadLinks(razorpayOrderId: string): Promise<GuestDownloadItemDto[]> {
    const purchases = await purchaseRepository.findByOrderId(razorpayOrderId);
    const beatPurchases = purchases.filter((p) => p.beatId);

    if (beatPurchases.length === 0) return [];

    const beatIds = beatPurchases.map((p) => p.beatId!.toString());
    const beats = await beatRepository.findByIds(beatIds, true);
    const beatMap = new Map(beats.map((b) => [b._id.toString(), b]));

    const items = await Promise.all(
      beatPurchases.map(async (p) => {
        const beat = beatMap.get(p.beatId!.toString());
        if (!beat) return null;

        const beatId = p.beatId!.toString();
        const { wavAllowed, stemsAllowed } = await resolveEntitlements(p, beatId);
        const links = await buildEntitledLinks(beat, wavAllowed, stemsAllowed);

        return {
          beatId,
          beatTitle: beat.title,
          coverUrl: beat.coverUrl || null,
          licenseType: p.licenseType || "basic",
          amount: p.amount,
          links,
        };
      })
    );

    return items.filter((item) => item !== null);
  },

  async signTaggedPreview(beat: IBeat): Promise<{
    url: string;
    filename: string;
    expiresInSeconds: number;
  }> {
    const value = beat.storageKeys?.preview || beat.audioTaggedUrl;
    if (!value) {
      throw new NotFoundError("Tagged preview");
    }

    const beatId = beat._id.toString();
    const url = await storageService.getDownloadUrlForValue(value, {
      expiresInSeconds: TAGGED_PREVIEW_TTL_SECONDS,
    });
    const filename = buildFilename(beat.title, "preview");

    logger.info("Tagged preview download URL generated", { beatId });
    audit({
      action: "download.tagged_preview",
      resourceType: "beat",
      resourceId: beatId,
    });

    return {
      url,
      filename,
      expiresInSeconds: TAGGED_PREVIEW_TTL_SECONDS,
    };
  },

  async getTaggedPreviewDownload(beatId: string): Promise<{
    url: string;
    filename: string;
    expiresInSeconds: number;
  }> {
    const beat = await beatRepository.findByIdWithKeys(beatId);
    if (!beat) {
      throw new NotFoundError("Beat");
    }
    return this.signTaggedPreview(beat);
  },
};
