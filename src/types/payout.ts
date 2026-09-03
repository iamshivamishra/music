import type { Types } from "mongoose";

export type PayoutStatus = "requested" | "processing" | "completed" | "failed";
export type PayoutMethod = "upi" | "bank_transfer";

export interface IBankDetails {
  accountNumber: string;
  ifsc: string;
  accountName: string;
}

export interface ITaxProfile {
  gstin?: string;
  pan?: string;
  legalName?: string;
  stateCode?: string;
  isComposition?: boolean;
}

export interface IPayoutDetails {
  upiId?: string;
  bankAccount?: IBankDetails;
  razorpayContactId?: string;
  razorpayFundAccountId?: string;
}

export interface IPayout {
  _id: string | Types.ObjectId;
  producerId: string | Types.ObjectId;
  amount: number;
  platformFee: number;
  netAmount: number;
  method: PayoutMethod;
  upiId?: string;
  bankDetails?: IBankDetails;
  status: PayoutStatus;
  razorpayPayoutId?: string;
  razorpayFundAccountId?: string;
  failureReason?: string;
  processedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
