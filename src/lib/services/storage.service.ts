import { ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { storageAdapter } from "@/lib/storage/adapter";
import {
  buildBeatKey,
  buildProfileKey,
  buildServiceDeliveryKey,
  isOwnedBeatAssetKey,
  type BeatFileCategory,
  type FileCategory,
  type ProfileFileCategory,
} from "@/lib/storage/keys";
import { validateFile } from "@/lib/storage/limits";
import { MULTIPART_PART_SIZE } from "@/lib/upload-client";
import type { IBeatStorageKeys } from "@/types";

const UPLOAD_URL_TTL_SECONDS = 600;

export interface StoredObject {
  url: string;
  key: string;
}

export interface PresignedUpload {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

interface BeatAssetFiles {
  preview: File;
  master: File;
  stems?: File;
  artwork?: File;
}

interface BeatAssetResults {
  preview: StoredObject;
  master: StoredObject;
  stems?: StoredObject;
  artwork?: StoredObject;
}

function assertValidFile(
  file: { size: number; type: string },
  category: FileCategory
): void {
  const validation = validateFile(file, category);
  if (!validation.valid) {
    throw new ValidationError("Validation failed", {
      [category]: [validation.error],
    });
  }
}

async function putFile(
  file: File,
  key: string,
  category: FileCategory
): Promise<StoredObject> {
  assertValidFile(file, category);
  const body = Buffer.from(await file.arrayBuffer());
  await storageAdapter.putObject({
    key,
    body,
    contentType: file.type,
  });
  return { url: storageAdapter.publicUrl(key), key };
}

function isHttpUrl(value: string): boolean {
  return value.startsWith("http://") || value.startsWith("https://");
}

export const storageService = {
  SIGNED_URL_TTL_SECONDS: 900,

  async getPresignedUploadUrl(
    producerId: string,
    beatId: string,
    category: BeatFileCategory,
    contentType: string,
    fileSize: number
  ): Promise<PresignedUpload> {
    assertValidFile({ size: fileSize, type: contentType }, category);
    const key = buildBeatKey(producerId, beatId, category);
    const uploadUrl = await storageAdapter.presignPut({
      key,
      contentType,
      expiresIn: UPLOAD_URL_TTL_SECONDS,
    });
    return { uploadUrl, publicUrl: storageAdapter.publicUrl(key), key };
  },

  async getPresignedProfileUploadUrl(
    producerId: string,
    category: ProfileFileCategory,
    contentType: string,
    fileSize: number
  ): Promise<PresignedUpload> {
    assertValidFile({ size: fileSize, type: contentType }, category);
    const key = buildProfileKey(producerId, category);
    const uploadUrl = await storageAdapter.presignPut({
      key,
      contentType,
      expiresIn: UPLOAD_URL_TTL_SECONDS,
    });
    return { uploadUrl, publicUrl: storageAdapter.publicUrl(key), key };
  },

  async uploadBeatFile(
    file: File,
    producerId: string,
    beatId: string,
    category: BeatFileCategory
  ): Promise<StoredObject> {
    const result = await putFile(
      file,
      buildBeatKey(producerId, beatId, category),
      category
    );
    logger.info("Beat file uploaded", { category, key: result.key, size: file.size });
    return result;
  },

  async uploadBeatAssets(
    producerId: string,
    beatId: string,
    files: BeatAssetFiles
  ): Promise<BeatAssetResults> {
    const [preview, master, stems, artwork] = await Promise.all([
      this.uploadBeatFile(files.preview, producerId, beatId, "preview"),
      this.uploadBeatFile(files.master, producerId, beatId, "master"),
      files.stems
        ? this.uploadBeatFile(files.stems, producerId, beatId, "stems")
        : Promise.resolve(undefined),
      files.artwork
        ? this.uploadBeatFile(files.artwork, producerId, beatId, "artwork")
        : Promise.resolve(undefined),
    ]);

    return { preview, master, stems, artwork };
  },

  async uploadProfileImage(
    file: File,
    producerId: string,
    category: ProfileFileCategory
  ): Promise<StoredObject> {
    const result = await putFile(
      file,
      buildProfileKey(producerId, category),
      category
    );
    logger.info("Profile image uploaded", { category, key: result.key, size: file.size });
    return result;
  },

  assertOwnedBeatAssetKeys(
    producerId: string,
    keys: IBeatStorageKeys
  ): void {
    const entries: Array<[BeatFileCategory, string | undefined]> = [
      ["preview", keys.preview],
      ["master", keys.master],
      ["stems", keys.stems],
      ["artwork", keys.artwork],
    ];

    const invalid = entries.find(
      ([category, key]) => key !== undefined && !isOwnedBeatAssetKey(key, producerId, category)
    );

    if (invalid) {
      throw new ValidationError("Validation failed", {
        uploadedAssets: [`Invalid uploaded asset key for ${invalid[0]}`],
      });
    }
  },

  resolveObjectKey(value: string): string | null {
    if (!isHttpUrl(value)) return value;
    return storageAdapter.tryKeyFromPublicUrl(value);
  },

  async getDownloadUrl(
    key: string,
    options: { expiresInSeconds?: number } = {}
  ): Promise<string> {
    return storageAdapter.presignGet({
      key,
      expiresIn: options.expiresInSeconds ?? this.SIGNED_URL_TTL_SECONDS,
    });
  },

  async getDownloadUrlForValue(
    value: string,
    options: { expiresInSeconds?: number } = {}
  ): Promise<string> {
    const key = this.resolveObjectKey(value);
    if (!key) return value;
    return this.getDownloadUrl(key, options);
  },

  async presignBeatAudio(
    beat: { audioTaggedUrl: string; storageKeys?: { preview?: string; master?: string } },
    hasPurchased: boolean
  ): Promise<string> {
    const key = hasPurchased
      ? beat.storageKeys?.master
      : beat.storageKeys?.preview;

    if (key) {
      return this.getDownloadUrl(key);
    }

    const fallbackUrl = beat.audioTaggedUrl;
    const resolvedKey = this.resolveObjectKey(fallbackUrl);
    if (resolvedKey) {
      return this.getDownloadUrl(resolvedKey);
    }

    return fallbackUrl;
  },

  async presignCoverUrl(coverUrl: string | undefined): Promise<string> {
    if (!coverUrl) return "";
    const key = this.resolveObjectKey(coverUrl);
    if (key) {
      return this.getDownloadUrl(key);
    }
    return coverUrl;
  },

  async deleteFile(key: string): Promise<void> {
    await storageAdapter.deleteObject(key);
  },

  getPublicUrl(key: string): string {
    return storageAdapter.publicUrl(key);
  },

  async initiateMultipartUpload(
    producerId: string,
    beatId: string,
    category: BeatFileCategory,
    contentType: string,
    fileSize: number
  ): Promise<{ uploadId: string; key: string; publicUrl: string; partUrls: string[] }> {
    assertValidFile({ size: fileSize, type: contentType }, category);
    const key = buildBeatKey(producerId, beatId, category);

    const { uploadId } = await storageAdapter.createMultipartUpload({
      key,
      contentType,
    });

    const partCount = Math.ceil(fileSize / MULTIPART_PART_SIZE);
    const partUrls = await Promise.all(
      Array.from({ length: partCount }, (_, i) =>
        storageAdapter.presignUploadPart({
          key,
          uploadId,
          partNumber: i + 1,
          expiresIn: UPLOAD_URL_TTL_SECONDS,
        })
      )
    );

    return { uploadId, key, publicUrl: storageAdapter.publicUrl(key), partUrls };
  },

  async initiateServiceDeliveryUpload(
    producerId: string,
    jobId: string,
    contentType: string,
    fileSize: number
  ): Promise<{ uploadId: string; key: string; publicUrl: string; partUrls: string[] }> {
    assertValidFile({ size: fileSize, type: contentType }, "service-delivery");
    const key = buildServiceDeliveryKey(producerId, jobId);

    const { uploadId } = await storageAdapter.createMultipartUpload({
      key,
      contentType,
    });

    const partCount = Math.ceil(fileSize / MULTIPART_PART_SIZE);
    const partUrls = await Promise.all(
      Array.from({ length: partCount }, (_, i) =>
        storageAdapter.presignUploadPart({
          key,
          uploadId,
          partNumber: i + 1,
          expiresIn: UPLOAD_URL_TTL_SECONDS,
        })
      )
    );

    return { uploadId, key, publicUrl: storageAdapter.publicUrl(key), partUrls };
  },

  async completeMultipartUpload(
    key: string,
    uploadId: string,
    parts: Array<{ PartNumber: number; ETag: string }>
  ): Promise<void> {
    await storageAdapter.completeMultipartUpload({ key, uploadId, parts });
    logger.info("Multipart upload finalized", { key, uploadId, parts: parts.length });
  },

  async abortMultipartUpload(key: string, uploadId: string): Promise<void> {
    await storageAdapter.abortMultipartUpload({ key, uploadId });
    logger.info("Multipart upload aborted", { key, uploadId });
  },
};
