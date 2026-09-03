import type { Types } from "mongoose";

import type { ProducerTier } from "./user";

export type InvitationStatus = "sent" | "accepted" | "expired";

export interface IInvitation {
  _id: string | Types.ObjectId;
  email: string;
  name?: string;
  token: string;
  status: InvitationStatus;
  producerTier: ProducerTier;
  platformFeeOverride: number;
  expiresAt: Date;
  invitedBy: string | Types.ObjectId;
  acceptedAt?: Date;
  followUp3SentAt?: Date;
  followUp7SentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
