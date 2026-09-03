import { z } from "zod";
import { currentIstYearMonth } from "@/lib/utils/ist";

const GSTIN_CHARS = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const STATE_CODE_REGEX = /^(0[1-9]|[1-3][0-8]|97)$/;
const MASKED_PAN_REGEX = /^X{6}[A-Z0-9]{4}$/;

/**
 * GSTN check-digit for the first 14 characters of a GSTIN.
 * Walks right-to-left with an alternating 2/1 factor over the 36-char alphabet.
 */
export function gstinCheckDigit(body14: string): string {
  const input = body14.toUpperCase();
  const mod = GSTIN_CHARS.length;
  let factor = 2;
  let sum = 0;

  for (let i = input.length - 1; i >= 0; i--) {
    const codePoint = GSTIN_CHARS.indexOf(input[i]!);
    if (codePoint < 0) return "";
    let digit = factor * codePoint;
    factor = factor === 2 ? 1 : 2;
    digit = Math.floor(digit / mod) + (digit % mod);
    sum += digit;
  }

  return GSTIN_CHARS[(mod - (sum % mod)) % mod]!;
}

export function isValidGstin(gstin: string): boolean {
  const value = gstin.toUpperCase().trim();
  if (!GSTIN_REGEX.test(value)) return false;
  return gstinCheckDigit(value.slice(0, 14)) === value[14];
}

export function isValidPan(pan: string): boolean {
  return PAN_REGEX.test(pan.toUpperCase().trim());
}

export function maskPan(pan: string): string {
  const upper = pan.toUpperCase().trim();
  if (upper.length <= 4) return "X".repeat(upper.length);
  return `${"X".repeat(upper.length - 4)}${upper.slice(-4)}`;
}

export function isMaskedPan(value: string): boolean {
  return MASKED_PAN_REGEX.test(value.toUpperCase().trim());
}

export const taxProfileSchema = z.object({
  gstin: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => value === "" || isValidGstin(value), {
      message: "Enter a valid 15-character GSTIN",
    })
    .optional(),
  pan: z
    .string()
    .trim()
    .transform((value) => value.toUpperCase())
    .refine((value) => value === "" || isMaskedPan(value) || isValidPan(value), {
      message: "Enter a valid 10-character PAN",
    })
    .optional(),
  legalName: z
    .string()
    .trim()
    .max(100, "Legal name must be at most 100 characters")
    .optional(),
  stateCode: z
    .string()
    .trim()
    .refine((value) => value === "" || STATE_CODE_REGEX.test(value), {
      message: "Enter a 2-digit GST state code",
    })
    .optional(),
  isComposition: z.boolean().optional(),
});

export const taxExportQuerySchema = z.object({
  year: z.coerce
    .number()
    .int()
    .min(2024)
    .refine((year) => year <= currentIstYearMonth().year + 1, {
      message: "Year is out of range",
    }),
  month: z.coerce.number().int().min(1).max(12),
  format: z.enum(["json", "csv", "payouts-csv", "pdf", "zip"]).default("json"),
});

export type TaxProfileInput = z.infer<typeof taxProfileSchema>;
export type TaxExportQueryInput = z.infer<typeof taxExportQuerySchema>;
