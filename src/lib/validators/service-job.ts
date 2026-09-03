import { z } from "zod";
import type { ServiceJobStatus } from "@/types";

export const MAX_REVISIONS = 2;
export const ACCEPT_WINDOW_MS = 72 * 60 * 60 * 1000;

export const OPEN_SERVICE_JOB_STATUSES: ServiceJobStatus[] = [
  "pending_deposit",
  "awaiting_acceptance",
  "in_progress",
  "delivered",
  "revision_requested",
  "disputed",
];

export const SERVICE_JOB_STATUSES = [
  "pending_deposit",
  "awaiting_acceptance",
  "in_progress",
  "delivered",
  "revision_requested",
  "completed",
  "cancelled",
  "disputed",
] as const;

const httpUrl = z
  .string()
  .trim()
  .url()
  .refine((value) => value.startsWith("http://") || value.startsWith("https://"), {
    message: "Reference URL must start with http:// or https://",
  });

export const createServiceJobSchema = z.object({
  listingId: z.string().min(1),
  notes: z.string().trim().min(10).max(5000),
  referencesUrl: httpUrl.optional().or(z.literal("")),
  bpm: z.number().int().min(40).max(300).optional(),
  genre: z.string().trim().max(60).optional(),
  duePreference: z.string().trim().max(200).optional(),
  extraIndexes: z.array(z.number().int().min(0)).max(5).default([]),
});

export const serviceJobListQuerySchema = z.object({
  status: z.enum(SERVICE_JOB_STATUSES).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const adminJobActionSchema = z.object({
  action: z.enum(["refund", "complete"]),
});

export type CreateServiceJobInput = z.infer<typeof createServiceJobSchema>;
export type ServiceJobListQuery = z.infer<typeof serviceJobListQuerySchema>;
export type AdminJobActionInput = z.infer<typeof adminJobActionSchema>;

export function parseServiceJobListQuery(params: {
  status?: string;
  page?: string;
  limit?: string;
}): ServiceJobListQuery {
  const parsed = serviceJobListQuerySchema.safeParse({
    status: params.status && params.status !== "all" ? params.status : undefined,
    page: params.page,
    limit: params.limit,
  });
  return parsed.success ? parsed.data : { page: 1, limit: 20 };
}
