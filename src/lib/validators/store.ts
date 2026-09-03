import { z } from "zod";

export const MAX_PINNED_BEATS = 3;
export const MAX_HEADLINE_LENGTH = 80;

export const updateStoreSchema = z.object({
  headline: z
    .string()
    .trim()
    .max(MAX_HEADLINE_LENGTH, `Headline must be at most ${MAX_HEADLINE_LENGTH} characters`)
    .optional()
    .transform((value) => (value ? value : undefined)),
  showWhatsApp: z.boolean().optional(),
  pinnedBeatIds: z
    .array(z.string().min(1))
    .max(MAX_PINNED_BEATS, `You can pin at most ${MAX_PINNED_BEATS} beats`)
    .refine((ids) => new Set(ids).size === ids.length, {
      message: "Pinned beats must be unique",
    })
    .default([]),
  featuredPackId: z.string().min(1).nullable().optional(),
});

export type UpdateStoreInput = z.input<typeof updateStoreSchema>;
