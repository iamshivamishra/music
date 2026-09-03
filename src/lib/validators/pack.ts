import { z } from "zod";

const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const packTierSchema = z.object({
  type: z.enum(["basic", "premium", "unlimited"]),
  name: z.string().min(1).max(60).trim(),
  price: z.coerce.number().min(1, "Tier price must be at least ₹1"),
  includesWav: z.boolean().default(false),
  includesStems: z.boolean().default(false),
  commercialUse: z.boolean().default(false),
  streamLimit: z.coerce.number().int().min(0).default(0),
  terms: z.string().min(1, "License terms are required"),
  isActive: z.boolean().default(true),
});

export const createPackSchema = z.object({
  title: z
    .string()
    .min(2, "Title must be at least 2 characters")
    .max(120, "Title must be at most 120 characters")
    .trim(),

  slug: z
    .string()
    .min(2)
    .max(120)
    .regex(SLUG_REGEX, "Slug must be lowercase alphanumeric with hyphens")
    .trim(),

  description: z
    .string()
    .max(2000, "Description must be at most 2000 characters")
    .trim()
    .optional(),

  genre: z.string().min(1, "Genre is required").trim(),

  tags: z
    .array(z.string().trim().min(1).max(30))
    .max(10, "Maximum 10 tags allowed")
    .default([]),

  beats: z
    .array(
      z.object({
        beatId: z.string().min(1),
        position: z.coerce.number().int().min(0),
      })
    )
    .default([]),

  coverImages: z.array(z.string().url()).max(10).default([]),

  tiers: z.array(packTierSchema).min(1, "At least one pricing tier is required").max(3),

  status: z.enum(["draft", "published"]).default("draft"),
});

export const updatePackSchema = z.object({
  title: z.string().min(2).max(120).trim().optional(),
  slug: z.string().min(2).max(120).regex(SLUG_REGEX).trim().optional(),
  description: z.string().max(2000).trim().optional(),
  genre: z.string().min(1).trim().optional(),
  tags: z.array(z.string().trim().min(1).max(30)).max(10).optional(),
  beats: z
    .array(
      z.object({
        beatId: z.string().min(1),
        position: z.coerce.number().int().min(0),
      })
    )
    .optional(),
  coverImages: z.array(z.string().url()).max(10).optional(),
  tiers: z.array(packTierSchema).min(1).max(3).optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  isPublished: z.boolean().optional(),
});

export const packFilterSchema = z.object({
  genre: z.string().optional(),
  search: z.string().max(100).optional(),
  producerId: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(12),
  sort: z.enum(["newest", "popular", "most_sold"]).default("newest"),
});

export type CreatePackInput = z.infer<typeof createPackSchema>;
export type UpdatePackInput = z.infer<typeof updatePackSchema>;
export type PackFilterInput = z.infer<typeof packFilterSchema>;
