import type { IServiceListing, IUser, ServiceListingStatus } from "@/types";

export interface PublicServiceListingDto {
  id: string;
  type: IServiceListing["type"];
  title: string;
  description: string;
  startingPrice: number;
  depositPercent: IServiceListing["depositPercent"];
  turnaroundDays: number;
  extras: IServiceListing["extras"];
  producerId: string;
  producerName?: string;
  producerUsername?: string;
  whatsappNumber?: string;
}

export function toPublicServiceListing(
  listing: IServiceListing,
  producer?: Pick<IUser, "displayName" | "name" | "username" | "socialLinks"> | null
): PublicServiceListingDto {
  return {
    id: listing._id.toString(),
    type: listing.type,
    title: listing.title,
    description: listing.description,
    startingPrice: listing.startingPrice,
    depositPercent: listing.depositPercent,
    turnaroundDays: listing.turnaroundDays,
    extras: listing.extras ?? [],
    producerId: listing.producerId.toString(),
    producerName: producer?.displayName || producer?.name,
    producerUsername: producer?.username,
    whatsappNumber: producer?.socialLinks?.whatsappNumber,
  };
}

export interface StudioServiceListingDto {
  id: string;
  type: IServiceListing["type"];
  title: string;
  description: string;
  startingPrice: number;
  depositPercent: IServiceListing["depositPercent"];
  turnaroundDays: number;
  extras: IServiceListing["extras"];
  status: ServiceListingStatus;
  createdAt: string;
  updatedAt: string;
}

export function toStudioServiceListing(listing: IServiceListing): StudioServiceListingDto {
  return {
    id: listing._id.toString(),
    type: listing.type,
    title: listing.title,
    description: listing.description,
    startingPrice: listing.startingPrice,
    depositPercent: listing.depositPercent,
    turnaroundDays: listing.turnaroundDays,
    extras: listing.extras ?? [],
    status: listing.status,
    createdAt: new Date(listing.createdAt).toISOString(),
    updatedAt: new Date(listing.updatedAt).toISOString(),
  };
}

export const SERVICE_TYPE_LABELS: Record<IServiceListing["type"], string> = {
  custom_beat: "Custom Beat",
  mixing: "Mixing",
  mastering: "Mastering",
  other: "Other",
};
