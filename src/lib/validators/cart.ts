import { z } from "zod";

export const addToCartSchema = z.object({
  beatId: z.string().min(1),
  licenseId: z.string().min(1),
  accessToken: z.string().min(1).optional(),
});

export const addPackToCartSchema = z.object({
  packId: z.string().min(1),
  packTier: z.enum(["basic", "premium", "unlimited"]),
});

export const updatePackTierSchema = z.object({
  packTier: z.enum(["basic", "premium", "unlimited"]),
});

export const updateCartLicenseSchema = z.object({
  licenseId: z.string().min(1),
});

export type AddToCartInput = z.infer<typeof addToCartSchema>;
export type AddPackToCartInput = z.infer<typeof addPackToCartSchema>;
export type UpdatePackTierInput = z.infer<typeof updatePackTierSchema>;
export type UpdateCartLicenseInput = z.infer<typeof updateCartLicenseSchema>;
