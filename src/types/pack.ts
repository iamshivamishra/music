import type { Types } from "mongoose";

import type { LicenseType } from "./license";

export type PackStatus = "draft" | "published" | "archived";

export interface IBeatPackTier {
  type: LicenseType;
  name: string;
  price: number;
  includesWav: boolean;
  includesStems: boolean;
  commercialUse: boolean;
  streamLimit: number;
  terms: string;
  isActive: boolean;
}

export interface IPackBeatEntry {
  beatId: string | Types.ObjectId;
  position: number;
}

export interface IBeatPack {
  _id: string | Types.ObjectId;
  title: string;
  slug: string;
  description?: string;
  producerId: string | Types.ObjectId;
  beats: IPackBeatEntry[];
  coverImages: string[];
  tiers: IBeatPackTier[];
  status: PackStatus;
  isPublished: boolean;
  salesCount: number;
  tags: string[];
  genre: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PackCartItemPopulated {
  packId: string;
  packTitle: string;
  packCoverUrl?: string;
  packGenre: string;
  producerName: string;
  packTier: LicenseType;
  tierName: string;
  price: number;
  beatCount: number;
}
