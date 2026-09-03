import { z } from "zod";
import { normalizeWhatsAppNumber } from "@/lib/utils/whatsapp";

function emptyToUndefined(value: unknown): unknown {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

export const captureLeadSchema = z
  .object({
    email: z.preprocess(
      emptyToUndefined,
      z.string().email("Enter a valid email").toLowerCase().optional()
    ),
    whatsappNumber: z.preprocess(emptyToUndefined, z.string().optional()),
    consent: z.literal(true, { error: "Consent is required" }),
  })
  .superRefine((data, ctx) => {
    if (!data.email && !data.whatsappNumber) {
      ctx.addIssue({
        code: "custom",
        path: ["email"],
        message: "Enter an email or WhatsApp number",
      });
    }

    if (data.whatsappNumber) {
      const normalized = normalizeWhatsAppNumber(data.whatsappNumber);
      if (!normalized) {
        ctx.addIssue({
          code: "custom",
          path: ["whatsappNumber"],
          message: "Enter a valid 10-digit Indian WhatsApp number",
        });
      }
    }
  })
  .transform((data) => {
    const whatsappNumber = data.whatsappNumber
      ? normalizeWhatsAppNumber(data.whatsappNumber) || undefined
      : undefined;

    return {
      email: data.email,
      whatsappNumber,
      consent: true as const,
    };
  });

export const listLeadsQuerySchema = z.object({
  beatId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const exportLeadsQuerySchema = z.object({
  beatId: z.string().optional(),
});

export type CaptureLeadInput = {
  email?: string;
  whatsappNumber?: string;
  consent: true;
};
export type ListLeadsQuery = z.infer<typeof listLeadsQuerySchema>;
export type ExportLeadsQuery = z.infer<typeof exportLeadsQuerySchema>;
