import type { Types } from "mongoose";

import type { IPayoutDetails, ITaxProfile } from "./payout";

export type UserRole = "buyer" | "producer" | "admin";

export interface IProducerStore {
  headline?: string;
  showWhatsApp?: boolean;
  pinnedBeatIds?: (string | Types.ObjectId)[];
  featuredPackId?: string | Types.ObjectId;
}

export interface IUser {
  _id: string | Types.ObjectId;
  name: string;
  email: string;
  image?: string;
  password?: string;
  role: UserRole;
  username?: string;
  displayName?: string;
  bio?: string;
  avatarUrl?: string;
  coverImageUrl?: string;
  genres?: string[];
  socialLinks?: {
    instagram?: string;
    youtube?: string;
    twitter?: string;
    website?: string;
    spotify?: string;
    soundcloud?: string;
    whatsappNumber?: string;
  };
  resetTokenHash?: string;
  resetTokenExpiry?: Date;
  verified?: boolean;
  producerTier?: "founding" | "standard";
  producerTierExpiresAt?: Date;
  platformFeeOverride?: number;
  followersCount?: number;
  salesCount?: number;
  notificationPrefs?: {
    saleWhatsApp: boolean;
    dropWhatsApp: boolean;
    saleEmail: boolean;
  };
  payoutDetails?: IPayoutDetails;
  taxProfile?: ITaxProfile;
  store?: IProducerStore;
  createdAt: Date;
  updatedAt: Date;
}

export interface JWTPayload {
  userId: string;
  email: string;
  role: UserRole;
}

export type ProducerTier = "founding" | "standard";
