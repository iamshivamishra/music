import { z } from "zod";
import {
  BEAT_FILE_CATEGORIES,
  PROFILE_FILE_CATEGORIES,
  SERVICE_FILE_CATEGORIES,
} from "@/lib/storage/keys";

export const beatPresignSchema = z.object({
  producerId: z.string().min(1).optional(),
  beatId: z.string().min(1),
  category: z.enum(BEAT_FILE_CATEGORIES),
  contentType: z.string().min(1),
  fileSize: z.number().int().positive(),
});

export const profilePresignSchema = z.object({
  category: z.enum(PROFILE_FILE_CATEGORIES),
  contentType: z.string().min(1),
  fileSize: z.number().int().positive(),
});

export const beatPresignReplaceSchema = beatPresignSchema.extend({
  replace: z.literal(true).optional(),
});

export const multipartInitSchema = z.object({
  producerId: z.string().min(1).optional(),
  beatId: z.string().min(1),
  category: z.enum(BEAT_FILE_CATEGORIES),
  contentType: z.string().min(1),
  fileSize: z.number().int().positive(),
});

export const multipartCompleteSchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().min(1),
  parts: z.array(
    z.object({
      PartNumber: z.number().int().positive(),
      ETag: z.string().min(1),
    })
  ).min(1),
});

export const multipartAbortSchema = z.object({
  key: z.string().min(1),
  uploadId: z.string().min(1),
});

export const serviceDeliveryInitSchema = z.object({
  category: z.enum(SERVICE_FILE_CATEGORIES).optional(),
  contentType: z.string().min(1),
  fileSize: z.number().int().positive(),
});

export const serviceDeliveryCompleteSchema = z.object({
  key: z.string().min(1),
});

export type BeatPresignInput = z.infer<typeof beatPresignSchema>;
export type ProfilePresignInput = z.infer<typeof profilePresignSchema>;
export type MultipartInitInput = z.infer<typeof multipartInitSchema>;
export type MultipartCompleteInput = z.infer<typeof multipartCompleteSchema>;
export type MultipartAbortInput = z.infer<typeof multipartAbortSchema>;
export type ServiceDeliveryInitInput = z.infer<typeof serviceDeliveryInitSchema>;
export type ServiceDeliveryCompleteInput = z.infer<typeof serviceDeliveryCompleteSchema>;
