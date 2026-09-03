import { getAppUrl } from "@/lib/app-url";
import { appendSrc } from "@/lib/attribution";
import type {
  BeatLicenseType,
  IBeat,
  IOffer,
  IOfferLicenseSnapshot,
  OfferStatus,
  PricedOffer,
} from "@/types";

export interface StudioOfferDto {
  id: string;
  status: OfferStatus;
  token?: string;
  amount?: number;
  licenseType: BeatLicenseType;
  licenseName: string;
  expiresAt?: string;
  createdAt: string;
  beat: { id: string; title: string; coverUrl?: string };
  requesterEmail?: string;
  requesterNote?: string;
  payUrl?: string;
}

export interface PublicOfferDto {
  token: string;
  status: OfferStatus;
  amount: number;
  expiresAt: string;
  licenseType: BeatLicenseType;
  licenseSnapshot: IOfferLicenseSnapshot;
  beat: { id: string; title: string; coverUrl?: string; genre: string };
  producerName: string;
}

export function toStudioOfferDto(
  offer: IOffer,
  beat: Pick<IBeat, "_id" | "title" | "coverUrl"> | null
): StudioOfferDto {
  const token = offer.token;
  return {
    id: offer._id.toString(),
    status: offer.status,
    token,
    amount: offer.amount,
    licenseType: offer.licenseType ?? "basic",
    licenseName: offer.licenseSnapshot?.name ?? "Custom offer",
    expiresAt: offer.expiresAt ? new Date(offer.expiresAt).toISOString() : undefined,
    createdAt: new Date(offer.createdAt).toISOString(),
    beat: {
      id: (beat?._id ?? offer.beatId).toString(),
      title: beat?.title ?? "Beat",
      coverUrl: beat?.coverUrl,
    },
    requesterEmail: offer.requesterEmail,
    requesterNote: offer.requesterNote,
    payUrl:
      token && offer.status === "open"
        ? appendSrc(`${getAppUrl()}/offer/${token}`, "offer")
        : undefined,
  };
}

export function toPublicOfferDto(
  offer: PricedOffer,
  beat: Pick<IBeat, "_id" | "title" | "coverUrl" | "genre">,
  producerName: string
): PublicOfferDto {
  return {
    token: offer.token,
    status: offer.status,
    amount: offer.amount,
    expiresAt: new Date(offer.expiresAt).toISOString(),
    licenseType: offer.licenseType,
    licenseSnapshot: offer.licenseSnapshot,
    beat: {
      id: beat._id.toString(),
      title: beat.title,
      coverUrl: beat.coverUrl,
      genre: beat.genre,
    },
    producerName,
  };
}
