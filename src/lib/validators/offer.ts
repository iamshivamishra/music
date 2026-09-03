import { z } from "zod";
import { LICENSE_TYPES } from "@/lib/validators/license";
import type { OfferListTab, OfferStatus } from "@/types";

export const OFFER_LIST_TABS = ["requests", "open", "closed"] as const;

export const OFFER_TAB_STATUSES: Record<OfferListTab, OfferStatus[]> = {
  requests: ["pending_request"],
  open: ["open"],
  closed: ["accepted", "expired", "withdrawn"],
};

export const createOfferSchema = z.object({
  beatId: z.string().min(1, "Beat ID is required"),
  licenseType: z.enum(LICENSE_TYPES),
  amount: z.coerce.number().int().min(100, "Amount must be at least ₹100").max(500_000),
  expiresInHours: z.coerce.number().int().min(1).max(168).default(48),
  buyerEmail: z.string().email().optional(),
  note: z.string().max(500).optional(),
  requestId: z.string().min(1).optional(),
});

export const requestOfferSchema = z.object({
  beatId: z.string().min(1, "Beat ID is required"),
  note: z.string().max(500).optional(),
  email: z.string().email("Valid email is required").optional(),
  accessToken: z.string().min(1).optional(),
});

export const offerCheckoutSchema = z.object({
  token: z.string().min(1, "Offer token is required"),
  guestEmail: z.string().email("Valid email is required").optional(),
  guestName: z.string().min(1).max(100).optional(),
});

export const listOffersQuerySchema = z.object({
  tab: z.enum(OFFER_LIST_TABS).default("open"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type CreateOfferInput = z.infer<typeof createOfferSchema>;
export type RequestOfferInput = z.infer<typeof requestOfferSchema>;
export type OfferCheckoutInput = z.infer<typeof offerCheckoutSchema>;
export type ListOffersQuery = z.infer<typeof listOffersQuerySchema>;
