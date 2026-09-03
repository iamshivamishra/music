import { z } from "zod";

export const libraryQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  search: z.string().trim().max(100).optional(),
});

export type LibraryQueryInput = z.infer<typeof libraryQuerySchema>;
