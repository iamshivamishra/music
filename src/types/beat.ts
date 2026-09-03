import type { Types } from "mongoose";

export interface IBeatStorageKeys {
  preview?: string;
  master?: string;
  stems?: string;
  artwork?: string;
}

export type BeatStatus = "draft" | "scheduled" | "unlisted" | "published" | "archived";
export type SplitsStatus = "inactive" | "pending" | "active";
export type CollabInviteStatus = "pending" | "accepted" | "declined";

export interface IBeatCollaborator {
  userId: string | Types.ObjectId;
  sharePercent: number;
  status: CollabInviteStatus;
  invitedAt: Date;
  respondedAt?: Date;
  expiresAt: Date;
}

export interface IBeatCollabCredit {
  username: string;
  displayName: string;
}

export interface IBeat {
  _id: string | Types.ObjectId;
  title: string;
  description?: string;
  producerId: string | Types.ObjectId;
  producerName?: string;
  producerUsername?: string;
  collaborators?: IBeatCollaborator[];
  ownerSharePercent?: number;
  splitsStatus?: SplitsStatus;
  showCollabCredits?: boolean;
  bpm?: number;
  key?: string;
  genre: string;
  tags: string[];
  mood?: string;
  duration: number;
  audioTaggedUrl: string;
  audioFullUrl: string;
  stemsUrl?: string;
  coverUrl?: string;
  storageKeys?: IBeatStorageKeys;
  status: BeatStatus;
  plays: number;
  salesCount: number;
  likesCount: number;
  sharesCount?: number;
  embedViews?: number;
  saleMode: SaleMode;
  isPublished: boolean;
  publishAt?: Date;
  publishedAt?: Date;
  privateToken?: string;
  exclusiveBuyerId?: string | Types.ObjectId;
  exclusiveSoldAt?: Date;
  freeDownloadEnabled?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFollow {
  _id?: string | Types.ObjectId;
  follower: Types.ObjectId;
  following: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface ILike {
  _id?: string | Types.ObjectId;
  userId: string | Types.ObjectId;
  beatId: string | Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type LeadSource = "free_download";

export interface ILead {
  _id?: string | Types.ObjectId;
  producerId: string | Types.ObjectId;
  beatId: string | Types.ObjectId;
  email?: string;
  whatsappNumber?: string;
  source: LeadSource;
  consentAt: Date;
  userId?: string | Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export const ATTRIBUTION_SOURCES = [
  "marketplace",
  "search",
  "profile",
  "embed",
  "whatsapp",
  "instagram",
  "youtube",
  "offer",
  "charts",
  "direct",
  "other",
] as const;

export type AttributionSource = (typeof ATTRIBUTION_SOURCES)[number];

export const ATTRIBUTION_SOURCE_LABELS: Record<AttributionSource, string> = {
  marketplace: "Marketplace",
  search: "Search",
  profile: "Profile",
  embed: "Embed",
  whatsapp: "WhatsApp",
  instagram: "Instagram",
  youtube: "YouTube",
  offer: "Offer",
  charts: "Charts",
  direct: "Direct",
  other: "Other",
};

export const BEAT_EVENT_KINDS = [
  "play",
  "pdp_view",
  "embed_view",
  "share",
  "checkout_start",
] as const;

export type BeatEventKind = (typeof BEAT_EVENT_KINDS)[number];

export interface IOrderAttribution {
  source: AttributionSource;
  beatId?: string | Types.ObjectId;
}

export interface IBeatEvent {
  _id: string | Types.ObjectId;
  beatId: string | Types.ObjectId;
  producerId: string | Types.ObjectId;
  kind: BeatEventKind;
  source: AttributionSource;
  createdAt: Date;
  updatedAt: Date;
}

export type SaleMode = "individual" | "pack_only";

export interface BeatFilters {
  genre?: string;
  bpm?: { min?: number; max?: number };
  key?: string;
  mood?: string;
  tags?: string[];
  search?: string;
  producer?: string;
  producerId?: string;
  /** Pre-resolved producer IDs for producer name/username search */
  producerIds?: string[];
  isPublished?: boolean;
}

// --- Featured beat types ---
export type FeaturedSection = "editor_picks" | "featured";

export interface IFeaturedBeat {
  _id: string | Types.ObjectId;
  beatId: string | Types.ObjectId;
  position: number;
  section: FeaturedSection;
  startDate: Date;
  endDate: Date;
  addedBy: string | Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
