import { z } from "zod";

export const embedCatalogQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(20).default(10),
});

export type EmbedCatalogQueryInput = z.infer<typeof embedCatalogQuerySchema>;
