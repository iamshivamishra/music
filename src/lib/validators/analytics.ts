import { z } from "zod";

export const FUNNEL_DAYS = [7, 30, 90] as const;
export type FunnelDays = (typeof FUNNEL_DAYS)[number];

export const funnelQuerySchema = z.object({
  days: z.coerce
    .number()
    .pipe(z.union([z.literal(7), z.literal(30), z.literal(90)]))
    .default(30),
});

export const shareBodySchema = z.object({
  source: z.string().max(32).optional(),
});
