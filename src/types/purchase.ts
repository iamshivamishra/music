import type { Types } from "mongoose";

import type { LicenseType } from "./license";
import type { IOfferLicenseSnapshot } from "./offer";

export type PurchaseSourceType = "individual" | "pack";

export interface IPurchase {
  _id: string | Types.ObjectId;
  buyerId?: string | Types.ObjectId;
  guestEmail?: string;
  producerId?: string | Types.ObjectId;
  beatId?: string | Types.ObjectId;
  licenseId?: string | Types.ObjectId;
  licenseType?: "basic" | "premium" | "unlimited" | "exclusive";
  includesWav?: boolean;
  includesStems?: boolean;
  packId?: string | Types.ObjectId;
  packTier?: LicenseType;
  sourceType?: PurchaseSourceType;
  sourcePackId?: string | Types.ObjectId;
  orderId: string;
  paymentId: string;
  amount: number;
  licenseNumber?: string;
  licensePdfKey?: string;
  verificationHash?: string;
  offerId?: string | Types.ObjectId;
  licenseSnapshot?: IOfferLicenseSnapshot;
  createdAt: Date;
  updatedAt: Date;
}

export interface IEarning {
  _id: string | Types.ObjectId;
  purchaseId: string | Types.ObjectId;
  orderId: string | Types.ObjectId;
  beatId?: string | Types.ObjectId;
  packId?: string | Types.ObjectId;
  producerId: string | Types.ObjectId;
  grossAmount: number;
  sharePercent: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface IProducerCustomerNote {
  _id: string | Types.ObjectId;
  producerId: string | Types.ObjectId;
  buyerId?: string | Types.ObjectId;
  guestEmailHash?: string;
  note: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BuyerStats {
  totalSpend: number;
  beatCount: number;
  packCount: number;
  tierMix: Record<string, number>;
  dominantTier: string | null;
  memberSince: Date;
}
