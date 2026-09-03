import type { Types } from "mongoose";

import type { BeatLicenseType } from "./license";

export type OfferStatus = "pending_request" | "open" | "accepted" | "expired" | "withdrawn";
export type OfferListTab = "requests" | "open" | "closed";

export interface IOfferLicenseSnapshot {
  name: string;
  includesWav: boolean;
  includesStems: boolean;
  commercialUse: boolean;
  streamLimit: number;
  terms: string;
}

export interface IOffer {
  _id: string | Types.ObjectId;
  producerId: string | Types.ObjectId;
  beatId: string | Types.ObjectId;
  token?: string;
  status: OfferStatus;
  requestedByUserId?: string | Types.ObjectId;
  requesterEmail?: string;
  requesterNote?: string;
  licenseType?: BeatLicenseType;
  licenseSnapshot?: IOfferLicenseSnapshot;
  amount?: number;
  expiresAt?: Date;
  acceptedOrderId?: string | Types.ObjectId;
  acceptedPurchaseId?: string | Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

/** Open/expired pay-link offers after checkoutable fields are present. */
export type PricedOffer = IOffer & {
  token: string;
  amount: number;
  licenseType: BeatLicenseType;
  licenseSnapshot: IOfferLicenseSnapshot;
  expiresAt: Date;
};

export type OpenOffer = PricedOffer & { status: "open" };
