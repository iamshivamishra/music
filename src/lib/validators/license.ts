import { z } from "zod";

export const LICENSE_TYPES = ["basic", "premium", "unlimited"] as const;

export type LicenseDefaults = {
  name: string;
  price: number;
  streamLimit: number;
  includesWav: boolean;
  includesStems: boolean;
  commercialUse: boolean;
  terms: string;
};

const LICENSE_DEFAULTS: Record<(typeof LICENSE_TYPES)[number], LicenseDefaults> = {
  basic: {
    name: "Basic License",
    price: 499,
    streamLimit: 5000,
    includesWav: false,
    includesStems: false,
    commercialUse: false,
    terms:
      "MP3 file only. Non-commercial use. Up to 5,000 streams. Must credit the producer.",
  },
  premium: {
    name: "Premium License",
    price: 1499,
    streamLimit: 50000,
    includesWav: true,
    includesStems: false,
    commercialUse: true,
    terms:
      "WAV + MP3 files. Commercial use allowed. Up to 50,000 streams. Credit appreciated.",
  },
  unlimited: {
    name: "Unlimited License",
    price: 9999,
    streamLimit: -1,
    includesWav: true,
    includesStems: true,
    commercialUse: true,
    terms:
      "WAV + MP3 + stems. Unlimited streams. Full commercial rights. Beat remains on marketplace.",
  },
};

export const createLicenseSchema = z.object({
  beatId: z.string().min(1, "Beat ID is required"),
  type: z.enum(LICENSE_TYPES, {
    error: "License type must be basic, premium, or unlimited",
  }),
  name: z.string().min(2).max(60).trim().optional(),
  price: z.coerce.number().min(1, "Price must be at least ₹1"),
  streamLimit: z.coerce.number().int().min(-1).default(5000),
  includesWav: z.boolean().default(false),
  includesStems: z.boolean().default(false),
  commercialUse: z.boolean().default(false),
  terms: z.string().min(10, "Terms must be at least 10 characters").max(1000),
});

export const updateLicenseSchema = z.object({
  name: z.string().min(2).max(60).trim().optional(),
  price: z.coerce.number().min(1, "Price must be at least ₹1").optional(),
  streamLimit: z.coerce.number().int().min(-1).optional(),
  includesWav: z.boolean().optional(),
  includesStems: z.boolean().optional(),
  commercialUse: z.boolean().optional(),
  terms: z.string().min(10).max(1000).optional(),
  isActive: z.boolean().optional(),
});

export { LICENSE_DEFAULTS };

export type CreateLicenseInput = z.infer<typeof createLicenseSchema>;
export type UpdateLicenseInput = z.infer<typeof updateLicenseSchema>;
