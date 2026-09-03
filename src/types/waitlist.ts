import type { Types } from "mongoose";

export type WaitlistStatus = "pending" | "invited" | "joined";

export interface IWaitlist {
  _id: string | Types.ObjectId;
  email: string;
  name: string;
  role: "producer";
  genres?: string[];
  socialLinks?: string;
  status: WaitlistStatus;
  invitedAt?: Date;
  joinedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
