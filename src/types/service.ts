import type { Types } from "mongoose";

export type ServiceListingType = "custom_beat" | "mixing" | "mastering" | "other";
export type ServiceListingStatus = "draft" | "published" | "paused";

export interface IServiceExtra {
  name: string;
  price: number;
}

export interface IServiceListing {
  _id: string | Types.ObjectId;
  producerId: string | Types.ObjectId;
  type: ServiceListingType;
  title: string;
  description: string;
  startingPrice: number;
  depositPercent: 20 | 50 | 100;
  turnaroundDays: number;
  extras: IServiceExtra[];
  status: ServiceListingStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type ServiceJobStatus =
  | "pending_deposit"
  | "awaiting_acceptance"
  | "in_progress"
  | "delivered"
  | "revision_requested"
  | "completed"
  | "cancelled"
  | "disputed";

export interface IServiceBrief {
  notes: string;
  referencesUrl?: string;
  bpm?: number;
  genre?: string;
  duePreference?: string;
}

export interface IServiceJob {
  _id: string | Types.ObjectId;
  listingId: string | Types.ObjectId;
  producerId: string | Types.ObjectId;
  buyerId: string | Types.ObjectId;
  status: ServiceJobStatus;
  brief: IServiceBrief;
  extras: IServiceExtra[];
  listingTitle: string;
  listingType: ServiceListingType;
  quotedTotal: number;
  depositAmount: number;
  balanceAmount: number;
  depositOrderId?: string | Types.ObjectId;
  balanceOrderId?: string | Types.ObjectId;
  deliveryKey?: string;
  revisionCount: number;
  acceptBy?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type ServicePaymentKind = "deposit" | "balance";
export type ServicePaymentStatus = "captured" | "eligible" | "refunded";

export interface IServicePayment {
  _id: string | Types.ObjectId;
  jobId: string | Types.ObjectId;
  producerId: string | Types.ObjectId;
  buyerId: string | Types.ObjectId;
  orderId: string | Types.ObjectId;
  kind: ServicePaymentKind;
  amount: number;
  status: ServicePaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}
