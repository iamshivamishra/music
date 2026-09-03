import { z } from "zod";

export const createOrderSchema = z.object({
  beatId: z.string().min(1, "Beat ID is required"),
  licenseId: z.string().min(1, "License ID is required"),
  accessToken: z.string().min(1).optional(),
});

export const createPackOrderSchema = z.object({
  packId: z.string().min(1, "Pack ID is required"),
  packTier: z.enum(["basic", "premium", "unlimited"]),
  couponCode: z.string().min(1).optional(),
  upgrade: z.boolean().optional(),
});

export const checkoutCartSchema = z.object({
  fromCart: z.literal(true),
  couponCode: z.string().min(1).optional(),
});

export const paymentCreateRequestSchema = z.union([
  checkoutCartSchema,
  createPackOrderSchema,
  createOrderSchema,
]);

export const verifyPaymentSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  paymentId: z.string().min(1, "Payment ID is required"),
  signature: z.string().min(1, "Signature is required"),
});

const guestEmailSchema = z
  .string()
  .email("Valid email is required")
  .transform((value) => value.toLowerCase().trim());

export const failOrderSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  reason: z.string().max(500).default("Payment cancelled by user"),
});

export const failGuestOrderSchema = failOrderSchema.extend({
  guestEmail: guestEmailSchema,
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
export type CreatePackOrderInput = z.infer<typeof createPackOrderSchema>;
export type CheckoutCartInput = z.infer<typeof checkoutCartSchema>;
export type PaymentCreateRequest = z.infer<typeof paymentCreateRequestSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type FailOrderInput = z.infer<typeof failOrderSchema>;
export type FailGuestOrderInput = z.infer<typeof failGuestOrderSchema>;

export const createGuestOrderSchema = z.object({
  beatId: z.string().min(1, "Beat ID is required"),
  licenseId: z.string().min(1, "License ID is required"),
  guestEmail: guestEmailSchema,
  guestName: z.string().min(1).max(100).optional(),
  accessToken: z.string().min(1).optional(),
});

export type CreateGuestOrderInput = z.infer<typeof createGuestOrderSchema>;

export const verifyGuestPaymentSchema = z.object({
  orderId: z.string().min(1, "Order ID is required"),
  paymentId: z.string().min(1, "Payment ID is required"),
  signature: z.string().min(1, "Signature is required"),
  guestEmail: guestEmailSchema,
});

export type VerifyGuestPaymentInput = z.infer<typeof verifyGuestPaymentSchema>;
