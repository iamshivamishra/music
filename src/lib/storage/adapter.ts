import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { logger } from "@/lib/logger";

let _client: S3Client | null = null;

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not set`);
  }
  return value;
}

function getClient(): S3Client {
  if (_client) return _client;

  _client = new S3Client({
    region: requiredEnv("AWS_S3_REGION"),
    credentials: {
      accessKeyId: requiredEnv("AWS_ACCESS_KEY_ID"),
      secretAccessKey: requiredEnv("AWS_SECRET_ACCESS_KEY"),
    },
    // Browser PUT presigns fail if the SDK adds checksum headers the client never sends.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });

  return _client;
}

function getBucket(): string {
  return requiredEnv("AWS_S3_BUCKET");
}

function publicBaseUrl(): string {
  return requiredEnv("AWS_S3_PUBLIC_URL").replace(/\/$/, "");
}

export const storageAdapter = {
  async putObject(input: {
    key: string;
    body: Buffer;
    contentType: string;
  }): Promise<void> {
    logger.info("Uploading object", {
      key: input.key,
      contentType: input.contentType,
      size: input.body.length,
    });

    await getClient().send(
      new PutObjectCommand({
        Bucket: getBucket(),
        Key: input.key,
        Body: input.body,
        ContentType: input.contentType,
      })
    );
  },

  async deleteObject(key: string): Promise<void> {
    logger.info("Deleting object", { key });
    await getClient().send(
      new DeleteObjectCommand({
        Bucket: getBucket(),
        Key: key,
      })
    );
  },

  async presignPut(input: {
    key: string;
    contentType: string;
    expiresIn: number;
  }): Promise<string> {
    const uploadUrl = await getSignedUrl(
      getClient(),
      new PutObjectCommand({
        Bucket: getBucket(),
        Key: input.key,
        ContentType: input.contentType,
      }),
      { expiresIn: input.expiresIn }
    );

    logger.info("Presigned upload URL created", {
      key: input.key,
      contentType: input.contentType,
      expiresIn: input.expiresIn,
    });

    return uploadUrl;
  },

  async presignGet(input: { key: string; expiresIn: number }): Promise<string> {
    return getSignedUrl(
      getClient(),
      new GetObjectCommand({
        Bucket: getBucket(),
        Key: input.key,
      }),
      { expiresIn: input.expiresIn }
    );
  },

  publicUrl(key: string): string {
    return `${publicBaseUrl()}/${key}`;
  },

  tryKeyFromPublicUrl(url: string): string | null {
    const base = process.env.AWS_S3_PUBLIC_URL?.replace(/\/$/, "");
    if (!base || !url.startsWith(base)) return null;
    const key = url.slice(base.length).replace(/^\/+/, "");
    return key || null;
  },

  async createMultipartUpload(input: {
    key: string;
    contentType: string;
  }): Promise<{ uploadId: string; key: string }> {
    const result = await getClient().send(
      new CreateMultipartUploadCommand({
        Bucket: getBucket(),
        Key: input.key,
        ContentType: input.contentType,
      })
    );

    if (!result.UploadId) {
      throw new Error("S3 did not return an UploadId");
    }

    logger.info("Multipart upload created", {
      key: input.key,
      uploadId: result.UploadId,
    });

    return { uploadId: result.UploadId, key: input.key };
  },

  async presignUploadPart(input: {
    key: string;
    uploadId: string;
    partNumber: number;
    expiresIn: number;
  }): Promise<string> {
    return getSignedUrl(
      getClient(),
      new UploadPartCommand({
        Bucket: getBucket(),
        Key: input.key,
        UploadId: input.uploadId,
        PartNumber: input.partNumber,
      }),
      { expiresIn: input.expiresIn }
    );
  },

  async completeMultipartUpload(input: {
    key: string;
    uploadId: string;
    parts: Array<{ PartNumber: number; ETag: string }>;
  }): Promise<void> {
    await getClient().send(
      new CompleteMultipartUploadCommand({
        Bucket: getBucket(),
        Key: input.key,
        UploadId: input.uploadId,
        MultipartUpload: {
          Parts: input.parts.sort((a, b) => a.PartNumber - b.PartNumber),
        },
      })
    );

    logger.info("Multipart upload completed", {
      key: input.key,
      uploadId: input.uploadId,
      parts: input.parts.length,
    });
  },

  async abortMultipartUpload(input: {
    key: string;
    uploadId: string;
  }): Promise<void> {
    await getClient().send(
      new AbortMultipartUploadCommand({
        Bucket: getBucket(),
        Key: input.key,
        UploadId: input.uploadId,
      })
    );

    logger.info("Multipart upload aborted", {
      key: input.key,
      uploadId: input.uploadId,
    });
  },
};
