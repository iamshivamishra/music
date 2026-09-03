import { z } from "zod";

export const SERVICE_LISTING_TYPES = [
  "custom_beat",
  "mixing",
  "mastering",
  "other",
] as const;

export const SERVICE_LISTING_STATUSES = ["draft", "published", "paused"] as const;

const extraSchema = z.object({
  name: z.string().trim().min(1).max(80),
  price: z.number().int().positive(),
});

export const createServiceListingSchema = z.object({
  type: z.enum(SERVICE_LISTING_TYPES),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(20).max(2000),
  startingPrice: z.number().int().min(1),
  depositPercent: z.union([z.literal(20), z.literal(50), z.literal(100)]),
  turnaroundDays: z.number().int().min(1).max(90),
  extras: z.array(extraSchema).max(5).default([]),
  status: z.enum(SERVICE_LISTING_STATUSES).default("draft"),
});

export const updateServiceListingSchema = createServiceListingSchema.partial();

export const serviceListingListQuerySchema = z.object({
  status: z.enum(SERVICE_LISTING_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateServiceListingInput = z.infer<typeof createServiceListingSchema>;
export type UpdateServiceListingInput = z.infer<typeof updateServiceListingSchema>;
export type ServiceListingListQuery = z.infer<typeof serviceListingListQuerySchema>;

export function parseServiceListingListQuery(params: {
  status?: string;
  page?: string;
  limit?: string;
}): ServiceListingListQuery {
  const parsed = serviceListingListQuerySchema.safeParse({
    status: params.status && params.status !== "all" ? params.status : undefined,
    page: params.page,
    limit: params.limit,
  });
  return parsed.success ? parsed.data : { page: 1, limit: 20 };
}
