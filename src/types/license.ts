import type { Types } from "mongoose";

export type LicenseType = "basic" | "premium" | "unlimited";
export type BeatLicenseType = "basic" | "premium" | "unlimited" | "exclusive";

export interface ILicense {
  _id: string | Types.ObjectId;
  beatId: string | Types.ObjectId;
  type: BeatLicenseType;
  name: string;
  price: number;
  streamLimit: number;
  includesWav: boolean;
  includesStems: boolean;
  commercialUse: boolean;
  terms: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
