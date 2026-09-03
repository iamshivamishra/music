import { z } from "zod";

export const producerSearchSchema = z.object({
  q: z.string().min(1).max(40).trim(),
});
