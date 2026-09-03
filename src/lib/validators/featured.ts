import { z } from "zod";

export const createFeaturedBeatSchema = z
  .object({
    beatId: z.string().min(1, "Beat ID is required"),
    section: z.enum(["editor_picks", "featured"]),
    position: z.number().int().min(1).max(20),
    startDate: z.string().pipe(z.coerce.date()),
    endDate: z.string().pipe(z.coerce.date()),
  })
  .refine((data) => data.endDate > data.startDate, {
    message: "End date must be after start date",
    path: ["endDate"],
  });

export type CreateFeaturedBeatInput = z.infer<typeof createFeaturedBeatSchema>;
