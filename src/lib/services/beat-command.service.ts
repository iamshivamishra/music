import { Types } from "mongoose";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { storageService } from "@/lib/services/storage.service";
import { beatQueryService } from "./beat-query.service";
import { withTransaction } from "@/lib/db";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  ValidationError,
} from "@/lib/errors";
import { LICENSE_DEFAULTS } from "@/lib/validators/license";
import { createBeatSchema } from "@/lib/validators/beat";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import type { CreateBeatInput } from "@/lib/validators/beat";
import type { IBeat } from "@/types";
import {
  generatePrivateToken,
  hasUnlistedToken,
} from "@/lib/services/beat-access";
import { visibilityChange, visibilityFields } from "@/lib/services/beat-visibility";
import { isFeatureEnabled } from "@/lib/feature-flags";
import {
  freeDownloadEnableBlock,
} from "@/lib/free-download";

const SCHEDULED_PUBLISH_BATCH = 100;

function assertCanEnableFreeDownload(
  beat: Pick<IBeat, "audioTaggedUrl" | "storageKeys" | "saleMode" | "exclusiveBuyerId">
) {
  if (!isFeatureEnabled("freeDownloadLeads")) {
    throw new ValidationError("Free tagged downloads are disabled");
  }
  switch (freeDownloadEnableBlock(beat)) {
    case null:
      return;
    case "exclusive":
      throw new ConflictError(
        "Cannot enable free download on a beat that has been exclusively sold"
      );
    case "pack_only":
      throw new ValidationError(
        "Free tagged download is not available for pack-only beats"
      );
    case "no_preview":
      throw new ValidationError(
        "Upload a tagged preview MP3 before offering a free download"
      );
  }
}

export const beatCommandService = {
  async create(
    input: CreateBeatInput,
    producerId: string,
    audioTaggedUrl: string,
    audioFullUrl: string,
    coverUrl?: string,
    stemsUrl?: string,
    storageKeys?: IBeat["storageKeys"]
  ): Promise<IBeat> {
    const {
      licenses,
      uploadedAssets: _uploadedAssets,
      status: inputStatus,
      publishAt,
      ...metadata
    } = input;
    const status = inputStatus || "draft";
    const { set: visibility } = visibilityFields(
      { status: "draft" },
      status,
      publishAt
    );

    if (input.freeDownloadEnabled) {
      assertCanEnableFreeDownload({
        audioTaggedUrl,
        storageKeys,
        saleMode: "individual",
      });
    }

    const beat = await withTransaction(async (session) => {
      const createdBeat = await beatRepository.create(
        {
          ...metadata,
          producerId: producerId as unknown as IBeat["producerId"],
          audioTaggedUrl,
          audioFullUrl,
          stemsUrl,
          coverUrl: coverUrl || "",
          storageKeys,
          plays: 0,
          salesCount: 0,
          likesCount: 0,
          ...visibility,
        },
        { session }
      );

      const defaultLicenses = Object.entries(LICENSE_DEFAULTS)
        .filter(([type]) => type !== "exclusive")
        .map(([type, defaults]) => {
          const override =
            licenses?.[type as "basic" | "premium" | "unlimited"];

          return {
            beatId: createdBeat._id,
            type: type as "basic" | "premium" | "unlimited",
            name: defaults.name,
            price: override?.price ?? defaults.price,
            streamLimit: defaults.streamLimit,
            includesWav: defaults.includesWav,
            includesStems: defaults.includesStems,
            commercialUse: defaults.commercialUse,
            terms: defaults.terms,
            isActive: true,
          };
        }
      );

      await licenseRepository.createMany(defaultLicenses, { session });

      if (licenses?.exclusive?.price) {
        const exclusiveDefaults = LICENSE_DEFAULTS.exclusive;
        await licenseRepository.createMany(
          [
            {
              beatId: createdBeat._id,
              type: "exclusive" as const,
              name: exclusiveDefaults.name,
              price: licenses.exclusive.price,
              streamLimit: exclusiveDefaults.streamLimit,
              includesWav: exclusiveDefaults.includesWav,
              includesStems: exclusiveDefaults.includesStems,
              commercialUse: exclusiveDefaults.commercialUse,
              terms: exclusiveDefaults.terms,
              isActive: true,
            },
          ],
          { session }
        );
      }

      return createdBeat;
    });

    logger.info("Beat created", {
      beatId: beat._id,
      producerId,
      status,
    });

    audit({
      action: "beat.create",
      userId: producerId,
      resourceType: "beat",
      resourceId: beat._id.toString(),
    });

    return beat;
  },

  async update(
    id: string,
    userId: string,
    userRole: string,
    data: Partial<IBeat>
  ): Promise<IBeat> {
    const beat = await beatQueryService.getById(id);

    if (beat.exclusiveBuyerId) {
      throw new ConflictError("Cannot modify a beat that has been exclusively sold");
    }

    if (
      beat.producerId.toString() !== userId &&
      userRole !== "admin"
    ) {
      throw new ForbiddenError(
        "You can only edit your own beats"
      );
    }

    const { isPublished: _clientIsPublished, ...safeData } = data;
    let unset: string[] | undefined;

    if (safeData.status !== undefined) {
      const change = await visibilityChange(
        beat,
        safeData.status,
        safeData.publishAt
      );
      Object.assign(safeData, change.set);
      unset = change.unset;
    }

    if (safeData.freeDownloadEnabled === true) {
      assertCanEnableFreeDownload({
        ...beat,
        ...safeData,
      });
    }

    const updated = await beatRepository.update(id, safeData, { unset });

    if (!updated) {
      throw new NotFoundError("Beat");
    }

    logger.info("Beat updated", {
      beatId: id,
      status: safeData.status,
    });

    audit({
      action: "beat.update",
      userId,
      resourceType: "beat",
      resourceId: id,
    });

    return updated;
  },

  async publish(
    id: string,
    userId: string,
    userRole: string
  ): Promise<IBeat> {
    const beat = await beatQueryService.getById(id);
    if (beat.exclusiveBuyerId) {
      throw new ConflictError("Cannot republish a beat that has been exclusively sold");
    }
    return beatCommandService.update(id, userId, userRole, {
      status: "published" as IBeat["status"],
      isPublished: true,
    });
  },

  async unpublish(
    id: string,
    userId: string,
    userRole: string
  ): Promise<IBeat> {
    return beatCommandService.update(id, userId, userRole, {
      status: "draft" as IBeat["status"],
      isPublished: false,
    });
  },

  async archive(
    id: string,
    userId: string,
    userRole: string
  ): Promise<IBeat> {
    return beatCommandService.update(id, userId, userRole, {
      status: "archived" as IBeat["status"],
    });
  },

  async unlist(
    id: string,
    userId: string,
    userRole: string,
    publishAt?: Date
  ): Promise<IBeat> {
    const data: Partial<IBeat> = { status: "unlisted" };
    if (publishAt) data.publishAt = publishAt;
    return beatCommandService.update(id, userId, userRole, data);
  },

  async schedule(
    id: string,
    userId: string,
    userRole: string,
    publishAt: Date
  ): Promise<IBeat> {
    return beatCommandService.update(id, userId, userRole, {
      status: "scheduled",
      publishAt,
    });
  },

  async rotatePrivateToken(
    id: string,
    userId: string,
    userRole: string
  ): Promise<IBeat> {
    const beat = await beatQueryService.getById(id);
    if (beat.producerId.toString() !== userId && userRole !== "admin") {
      throw new ForbiddenError("You can only edit your own beats");
    }
    if (beat.status !== "unlisted") {
      throw new ConflictError("Only unlisted beats have a private link");
    }
    let updated: IBeat | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        updated = await beatRepository.update(id, {
          privateToken: generatePrivateToken(),
        });
        break;
      } catch (error) {
        const duplicate =
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          (error as { code: unknown }).code === 11000;
        if (!duplicate || attempt === 2) throw error;
      }
    }
    if (!updated) throw new NotFoundError("Beat");
    audit({
      action: "beat.update",
      userId,
      resourceType: "beat",
      resourceId: id,
      metadata: { action: "rotate_private_token" },
    });
    return updated;
  },

  async unlockUnlisted(id: string, token: string): Promise<void> {
    const beat = await beatRepository.findById(id);
    if (!beat || !hasUnlistedToken(beat, token)) {
      throw new NotFoundError("Beat");
    }
  },

  async publishDueScheduled(now = new Date()) {
    if (!isFeatureEnabled("privateDrops")) {
      return { published: 0, remaining: 0 };
    }
    const due = await beatRepository.findDueScheduled(
      now,
      SCHEDULED_PUBLISH_BATCH + 1
    );
    const overflow = due.length > SCHEDULED_PUBLISH_BATCH;
    const batch = due.slice(0, SCHEDULED_PUBLISH_BATCH);
    if (batch.length === 0) {
      return { published: 0, remaining: 0 };
    }

    const published = await beatRepository.markPublishedMany(
      batch.map((beat) => beat._id.toString()),
      now
    );

    let remaining = 0;
    if (overflow) {
      remaining = await beatRepository.countDueScheduled(now);
      logger.warn("Scheduled publish remainder", { remaining, published });
    } else {
      logger.info("Scheduled beats published", { published });
    }

    return { published, remaining };
  },

  async delete(
    id: string,
    userId: string,
    userRole: string
  ): Promise<void> {
    const beat = await beatQueryService.getById(id);

    if (
      beat.producerId.toString() !== userId &&
      userRole !== "admin"
    ) {
      throw new ForbiddenError(
        "You can only delete your own beats"
      );
    }

    const purchasesCount =
      await purchaseRepository.countByBeat(id);

    if (purchasesCount > 0) {
      throw new ConflictError(
        "Cannot delete beat because it already has purchases"
      );
    }

    await withTransaction(async (session) => {
      await licenseRepository.deleteByBeatId(id, {
        session,
      });

      await beatRepository.delete(id, {
        session,
      });
    });

    logger.info("Beat deleted", {
      beatId: id,
      deletedBy: userId,
    });

    audit({
      action: "beat.delete",
      userId,
      resourceType: "beat",
      resourceId: id,
    });
  },

  async markExclusivelySold(
    beatId: string,
    buyerId: string,
    options?: { session?: import("mongoose").ClientSession }
  ): Promise<IBeat | null> {
    return beatRepository.markExclusive(
      beatId,
      {
        status: "archived",
        isPublished: false,
        exclusiveBuyerId: buyerId,
        exclusiveSoldAt: new Date(),
      },
      options
    );
  },

  async createFromJsonUpload(
    body: unknown,
    producerId: string
  ): Promise<IBeat> {
    const input = createBeatSchema.parse(body);
    const { uploadedAssets, ...metadata } = input;
    if (!uploadedAssets) {
      throw new ValidationError("Validation failed", {
        uploadedAssets: ["uploadedAssets is required for JSON uploads"],
      });
    }

    storageService.assertOwnedBeatAssetKeys(producerId, {
      preview: uploadedAssets.preview.key,
      master: uploadedAssets.master.key,
      stems: uploadedAssets.stems?.key,
      artwork: uploadedAssets.artwork?.key,
    });

    return beatCommandService.create(
      metadata,
      producerId,
      uploadedAssets.preview.url,
      uploadedAssets.master.url,
      uploadedAssets.artwork?.url,
      uploadedAssets.stems?.url,
      {
        preview: uploadedAssets.preview.key,
        master: uploadedAssets.master.key,
        stems: uploadedAssets.stems?.key,
        artwork: uploadedAssets.artwork?.key,
      }
    );
  },

  async createFromFormData(
    formData: FormData,
    producerId: string
  ): Promise<IBeat> {
    const metadata = {
      title: formData.get("title") as string,
      description: (formData.get("description") as string) || undefined,
      bpm: formData.get("bpm") ? Number(formData.get("bpm")) : undefined,
      key: (formData.get("key") as string) || undefined,
      genre: formData.get("genre") as string,
      tags: formData.get("tags")
        ? (formData.get("tags") as string)
            .split(",")
            .map((t) => t.trim())
        : [],
      mood: (formData.get("mood") as string) || undefined,
      status: (formData.get("status") as string) || "draft",
      licenses: formData.get("licenses")
        ? JSON.parse(formData.get("licenses") as string)
        : undefined,
    };

    const input = createBeatSchema.parse(metadata);

    const taggedAudio = formData.get("audioTagged") as File;
    const fullAudio = formData.get("audioFull") as File;
    const stemsFile = formData.get("stems") as File | null;
    const cover = formData.get("cover") as File | null;

    if (!taggedAudio || !fullAudio) {
      throw new ValidationError("Validation failed", {
        files: ["Both preview MP3 and master WAV are required"],
      });
    }

    const uploadBeatId = new Types.ObjectId().toString();
    const assets = await storageService.uploadBeatAssets(
      producerId,
      uploadBeatId,
      {
        preview: taggedAudio,
        master: fullAudio,
        stems: stemsFile && stemsFile.size > 0 ? stemsFile : undefined,
        artwork: cover && cover.size > 0 ? cover : undefined,
      }
    );

    return beatCommandService.create(
      input,
      producerId,
      assets.preview.url,
      assets.master.url,
      assets.artwork?.url,
      assets.stems?.url,
      {
        preview: assets.preview.key,
        master: assets.master.key,
        stems: assets.stems?.key,
        artwork: assets.artwork?.key,
      }
    );
  },
};
