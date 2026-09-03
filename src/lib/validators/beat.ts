import { z } from "zod";

const GENRES = [
  "Hip Hop",
  "Trap",
  "R&B",
  "Pop",
  "Lo-Fi",
  "Drill",
  "Boom Bap",
  "Afrobeats",
  "Dancehall",
  "Electronic",
  "Rock",
  "Jazz",
  "Soul",
  "Reggaeton",
  "Other",
] as const;

const MUSICAL_KEYS = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
  "Cm",
  "C#m",
  "Dm",
  "D#m",
  "Em",
  "Fm",
  "F#m",
  "Gm",
  "G#m",
  "Am",
  "A#m",
  "Bm",
] as const;

const MOODS = [
  "Dark",
  "Happy",
  "Sad",
  "Energetic",
  "Chill",
  "Aggressive",
  "Romantic",
  "Motivational",
  "Melancholic",
  "Upbeat",
] as const;

const uploadedAssetSchema = z.object({
  url: z.string().url("Asset URL must be valid"),
  key: z.string().min(1, "Asset key is required"),
});

export const BEAT_VISIBILITY_STATUSES = [
  "draft",
  "unlisted",
  "scheduled",
  "published",
] as const;

export const BEAT_STATUS_VALUES = [
  ...BEAT_VISIBILITY_STATUSES,
  "archived",
] as const;

export const PUBLISH_AT_MAX_DAYS = 90;

function assertPublishAtWindow(
  publishAt: Date,
  ctx: z.RefinementCtx,
  path: (string | number)[] = ["publishAt"]
) {
  const now = Date.now();
  if (publishAt.getTime() <= now) {
    ctx.addIssue({
      code: "custom",
      path,
      message: "Publish date must be in the future",
    });
  }
  const max = now + PUBLISH_AT_MAX_DAYS * 24 * 60 * 60 * 1000;
  if (publishAt.getTime() > max) {
    ctx.addIssue({
      code: "custom",
      path,
      message: `Publish date must be within ${PUBLISH_AT_MAX_DAYS} days`,
    });
  }
}

function refinePublishAt(
  data: { status?: string; publishAt?: Date },
  ctx: z.RefinementCtx
) {
  if (data.status === "scheduled" && !data.publishAt) {
    ctx.addIssue({
      code: "custom",
      path: ["publishAt"],
      message: "Publish date is required when scheduling a beat",
    });
  }
  if (data.publishAt) {
    assertPublishAtWindow(data.publishAt, ctx);
  }
}

export const createBeatSchema = z
  .object({
    title: z
      .string()
      .min(2, "Title must be at least 2 characters")
      .max(100, "Title must be at most 100 characters")
      .trim(),

    description: z
      .string()
      .max(1000, "Description must be at most 1000 characters")
      .trim()
      .optional(),

    bpm: z.coerce
      .number()
      .int()
      .min(40, "BPM must be at least 40")
      .max(300, "BPM must be at most 300")
      .optional(),

    key: z.enum(MUSICAL_KEYS).optional(),

    genre: z.enum(GENRES, {
      error: "Please select a valid genre",
    }),

    tags: z
      .array(z.string().trim().min(1).max(30))
      .max(10, "Maximum 10 tags allowed")
      .default([]),

    mood: z.enum(MOODS).optional(),

    status: z.enum(BEAT_VISIBILITY_STATUSES).default("draft"),

    publishAt: z.coerce.date().optional(),

    licenses: z
      .object({
        basic: z
          .object({
            price: z.coerce.number().min(0),
          })
          .optional(),

        premium: z
          .object({
            price: z.coerce.number().min(0),
          })
          .optional(),

        unlimited: z
          .object({
            price: z.coerce.number().min(0),
          })
          .optional(),

        exclusive: z
          .object({
            price: z.coerce.number().min(0),
          })
          .optional(),
      })
      .optional(),

    uploadedAssets: z
      .object({
        preview: uploadedAssetSchema,
        master: uploadedAssetSchema,
        stems: uploadedAssetSchema.optional(),
        artwork: uploadedAssetSchema.optional(),
      })
      .optional(),

    freeDownloadEnabled: z.boolean().optional().default(false),
  })
  .superRefine(refinePublishAt);

export const updateBeatSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(100, "Title must be at most 100 characters")
    .trim()
    .optional(),

  description: z
    .string()
    .max(1000, "Description must be at most 1000 characters")
    .trim()
    .optional(),

  bpm: z.coerce.number().int().min(40).max(300).optional(),

  key: z.enum(MUSICAL_KEYS).optional(),

  genre: z.enum(GENRES).optional(),

  tags: z
    .array(z.string().trim().min(1).max(30))
    .max(10)
    .optional(),

  mood: z.enum(MOODS).optional(),

  status: z.enum(BEAT_VISIBILITY_STATUSES).optional(),

  publishAt: z.coerce.date().optional(),

  isPublished: z.boolean().optional(),

  freeDownloadEnabled: z.boolean().optional(),

  licenses: z
    .object({
      basic: z
        .object({
          price: z.coerce.number().min(0),
        })
        .optional(),

      premium: z
        .object({
          price: z.coerce.number().min(0),
        })
        .optional(),

      unlimited: z
        .object({
          price: z.coerce.number().min(0),
        })
        .optional(),

      exclusive: z
        .object({
          price: z.coerce.number().min(0),
        })
        .optional(),
    })
    .optional(),
})
.superRefine(refinePublishAt);

export const beatStatusActionSchema = z
  .object({
    status: z.enum(BEAT_STATUS_VALUES).optional(),
    publishAt: z.coerce.date().optional(),
    rotateToken: z.boolean().optional(),
  })
  .superRefine((data, ctx) => {
    if (!data.status && !data.rotateToken) {
      ctx.addIssue({
        code: "custom",
        path: ["status"],
        message: "Status or rotateToken is required",
      });
    }
    refinePublishAt(data, ctx);
  });

export const BPM_FILTER_MIN = 40;
export const BPM_FILTER_MAX = 300;
export const BPM_FILTER_STEP = 5;
export const PRICE_FILTER_MIN = 0;
export const PRICE_FILTER_MAX = 50_000;
export const PRICE_FILTER_STEP = 100;

function omitEmpty(value: unknown): unknown {
  if (value === "" || value === undefined || value === null) return undefined;
  return value;
}

const optionalBpm = z.preprocess(
  omitEmpty,
  z.coerce.number().int().min(BPM_FILTER_MIN).max(BPM_FILTER_MAX).optional()
);

const optionalPriceMin = z.preprocess(
  omitEmpty,
  z.coerce.number().min(PRICE_FILTER_MIN).max(PRICE_FILTER_MAX).optional()
);

const optionalPriceMax = z.preprocess(
  omitEmpty,
  z.coerce.number().min(PRICE_FILTER_MIN).max(PRICE_FILTER_MAX).optional()
);

export const beatFilterSchema = z.object({
  genre: z.enum(GENRES).optional(),

  bpmMin: optionalBpm,

  bpmMax: optionalBpm,

  key: z.enum(MUSICAL_KEYS).optional(),

  mood: z.enum(MOODS).optional(),

  tags: z.string().max(500).optional(),

  search: z.string().max(100).optional(),

  producer: z.string().max(100).optional(),

  producerId: z.string().optional(),

  priceMin: optionalPriceMin,

  priceMax: optionalPriceMax,

  status: z.enum(BEAT_STATUS_VALUES).optional(),

  page: z.coerce.number().int().min(1).default(1),

  limit: z.coerce.number().int().min(1).max(50).default(12),

  sort: z
    .enum([
      "newest",
      "popular",
      "most_sold",
      "price_asc",
      "price_desc",
    ])
    .default("newest"),
});

export const beatStatusSchema = z.object({
  status: z.enum(BEAT_STATUS_VALUES),
});

export type BeatStatusInput = z.infer<typeof beatStatusSchema>;

export const GENRE_OPTIONS = GENRES;
export const KEY_OPTIONS = MUSICAL_KEYS;
export const MOOD_OPTIONS = MOODS;

export type CreateBeatInput = z.infer<typeof createBeatSchema>;
export type UpdateBeatInput = z.infer<typeof updateBeatSchema>;
export type BeatFilterInput = z.infer<typeof beatFilterSchema>;
export type BeatStatusActionInput = z.infer<typeof beatStatusActionSchema>;