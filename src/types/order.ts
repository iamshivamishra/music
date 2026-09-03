import type { Types } from "mongoose";

import type { BeatLicenseType, LicenseType } from "./license";
import type { IOrderAttribution } from "./beat";

export type OrderStatus = "pending" | "paid" | "failed" | "refunded";

export type OrderItemKind = "service_deposit" | "service_balance";

export interface IOrderItem {
  beatId?: string | Types.ObjectId;
  licenseId?: string | Types.ObjectId;
  licenseType?: BeatLicenseType;
  price: number;
  beatTitle?: string;
  packId?: string | Types.ObjectId;
  packTier?: LicenseType;
  packTitle?: string;
  kind?: OrderItemKind;
  serviceJobId?: string | Types.ObjectId;
  serviceTitle?: string;
}

export interface IGstBreakup {
  baseAmount: number;
  gstRate: number;
  gstAmount: number;
  igst?: number;
  cgst?: number;
  sgst?: number;
}

export interface IOrder {
  _id: string | Types.ObjectId;
  buyerId?: string | Types.ObjectId;
  guestEmail?: string;
  guestName?: string;
  items: IOrderItem[];
  totalAmount: number;
  status: OrderStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  receipt: string;
  couponCode?: string;
  couponId?: string | Types.ObjectId;
  discountAmount?: number;
  discountPerPack?: Record<string, number>;
  subtotalAmount?: number;
  failureReason?: string;
  paidAt?: Date;
  invoiceNumber?: string;
  invoicePdfKey?: string;
  gstBreakup?: IGstBreakup;
  downloadToken?: string;
  downloadTokenExpiry?: Date;
  offerId?: string | Types.ObjectId;
  attribution?: IOrderAttribution;
  createdAt: Date;
  updatedAt: Date;
}

export interface ICartItem {
  _id?: string | Types.ObjectId;
  userId: string | Types.ObjectId;
  beatId?: string | Types.ObjectId;
  licenseId?: string | Types.ObjectId;
  packId?: string | Types.ObjectId;
  packTier?: LicenseType;
  addedAt: Date;
}

export interface CartItemPopulated {
  beatId: string;
  licenseId: string;
  beatTitle: string;
  beatCoverUrl?: string;
  beatGenre: string;
  producerName: string;
  licenseName: string;
  licenseType: BeatLicenseType;
  price: number;
}
