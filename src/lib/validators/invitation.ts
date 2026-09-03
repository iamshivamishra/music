import { z } from "zod";

export const sendInvitationSchema = z.object({
  email: z.string().email("Valid email is required"),
  name: z.string().min(1, "Name is required").max(100),
});

export const acceptInvitationSchema = z.object({
  token: z.string().min(1, "Token is required"),
});

export const updateProducerTierSchema = z
  .object({
    producerTier: z.enum(["founding", "standard"]).optional(),
    platformFeeOverride: z.number().min(0).max(100).optional(),
    producerTierExpiresAt: z.string().datetime().optional(),
  })
  .refine(
    (data) => {
      if (data.producerTierExpiresAt && new Date(data.producerTierExpiresAt) <= new Date()) {
        return false;
      }
      return true;
    },
    { message: "Producer tier expiry must be a future date", path: ["producerTierExpiresAt"] }
  );

export type SendInvitationInput = z.infer<typeof sendInvitationSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type UpdateProducerTierInput = z.infer<typeof updateProducerTierSchema>;
