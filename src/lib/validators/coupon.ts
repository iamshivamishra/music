import { z } from "zod";

const COUPON_STATUSES = ["draft", "active", "paused", "scheduled"] as const;
const COUPON_TYPES = ["flat", "percent"] as const;

export const createCouponSchema = z
  .object({
    code: z
      .string()
      .min(3)
      .max(30)
      .regex(/^[A-Z0-9_-]+$/i, "Code must be alphanumeric with dashes/underscores"),
    type: z.enum(COUPON_TYPES),
    value: z.number().positive(),
    maxDiscount: z.number().positive().optional(),
    minOrderAmount: z.number().nonnegative().optional(),
    status: z.enum(COUPON_STATUSES).default("draft"),
    scheduledAt: z.coerce.date().optional(),
    expiresAt: z.coerce.date().optional(),
    usageLimit: z.number().int().positive().optional(),
    maxUsesPerUser: z.number().int().nonnegative().default(0),
    packIds: z.array(z.string().min(1)).default([]),
    emailRestrictions: z.array(z.string().email()).default([]),
  })
  .refine(
    (data) => {
      if (data.type === "percent" && data.value > 100) return false;
      return true;
    },
    { message: "Percent discount value cannot exceed 100", path: ["value"] }
  )
  .refine(
    (data) => {
      if (data.expiresAt && data.scheduledAt && data.expiresAt <= data.scheduledAt) return false;
      return true;
    },
    { message: "Expiry date must be after the scheduled start date", path: ["expiresAt"] }
  );

export const updateCouponSchema = createCouponSchema.partial().omit({ code: true });

export const validateCouponSchema = z.object({
  code: z.string().min(1, "Coupon code is required"),
  packIds: z.array(z.string().min(1)).min(1, "At least one pack is required"),
  tiers: z.record(z.string(), z.enum(["basic", "premium", "unlimited"])).optional(),
});

export type CreateCouponInput = z.infer<typeof createCouponSchema>;
export type UpdateCouponInput = z.infer<typeof updateCouponSchema>;
export type ValidateCouponInput = z.infer<typeof validateCouponSchema>;
