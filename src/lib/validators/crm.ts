import { z } from "zod";

export const CUSTOMER_KEY_PATTERN =
  /^(user:[a-f0-9]{24}|email:[a-f0-9]{64})$/i;

export const listCustomersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).catch(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).catch(20).default(20),
  q: z
    .string()
    .trim()
    .max(100)
    .optional()
    .transform((value) => (value ? value : undefined)),
});

export const customerKeySchema = z
  .string()
  .regex(CUSTOMER_KEY_PATTERN, "Invalid customer key");

export const upsertCustomerNoteSchema = z.object({
  note: z.string().max(1000),
});

export type ListCustomersQueryInput = z.infer<typeof listCustomersQuerySchema>;
export type UpsertCustomerNoteInput = z.infer<typeof upsertCustomerNoteSchema>;
