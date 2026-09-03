import { randomBytes } from "crypto";
import type { ClientSession } from "mongoose";
import { offerRepository } from "@/lib/repositories/offer.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { emailService } from "@/lib/services/email.service";
import { assertBeatLicensable, assertBeatPurchasable } from "@/lib/services/purchase-guards";
import { LICENSE_DEFAULTS } from "@/lib/validators/license";
import { OFFER_TAB_STATUSES } from "@/lib/validators/offer";
import {
  toPublicOfferDto,
  toStudioOfferDto,
  type PublicOfferDto,
  type StudioOfferDto,
} from "@/lib/serializers/offer";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { withFeatureFlag } from "@/lib/assert-feature";
import type {
  BeatLicenseType,
  IBeat,
  ILicense,
  IOffer,
  IOfferLicenseSnapshot,
  OfferListTab,
  OpenOffer,
  PaginatedResult,
  PricedOffer,
} from "@/types";
import type { CreateOfferInput, RequestOfferInput } from "@/lib/validators/offer";

interface SessionOptions {
  session?: ClientSession;
}

function generateOfferToken(): string {
  return randomBytes(16).toString("hex");
}

function snapshotFromDefaults(type: BeatLicenseType): IOfferLicenseSnapshot {
  const defaults = LICENSE_DEFAULTS[type];
  return {
    name: defaults.name,
    includesWav: defaults.includesWav,
    includesStems: defaults.includesStems,
    commercialUse: defaults.commercialUse,
    streamLimit: defaults.streamLimit,
    terms: defaults.terms,
  };
}

function snapshotFromLicense(license: ILicense): IOfferLicenseSnapshot {
  return {
    name: license.name,
    includesWav: license.includesWav,
    includesStems: license.includesStems,
    commercialUse: license.commercialUse,
    streamLimit: license.streamLimit,
    terms: license.terms,
  };
}

async function buildLicenseSnapshot(
  beatId: string,
  licenseType: BeatLicenseType
): Promise<IOfferLicenseSnapshot> {
  const catalog = await licenseRepository.findActiveByBeatAndType(beatId, licenseType);
  return catalog ? snapshotFromLicense(catalog) : snapshotFromDefaults(licenseType);
}

function asPricedOffer(offer: IOffer): PricedOffer | null {
  if (
    !offer.token ||
    offer.amount == null ||
    !offer.licenseSnapshot ||
    !offer.licenseType ||
    !offer.expiresAt
  ) {
    return null;
  }
  return offer as PricedOffer;
}

function asOpenOffer(offer: IOffer): OpenOffer | null {
  if (offer.status !== "open") return null;
  const priced = asPricedOffer(offer);
  return priced ? (priced as OpenOffer) : null;
}

async function requireOwnedPublishedBeat(beatId: string, producerId: string): Promise<IBeat> {
  const beat = await beatRepository.findById(beatId);
  if (!beat) throw new NotFoundError("Beat");
  if (beat.producerId.toString() !== producerId) {
    throw new ForbiddenError("You can only create offers for your own beats");
  }
  assertBeatLicensable(beat);
  return beat;
}

async function expireIfNeeded(offer: IOffer): Promise<IOffer> {
  if (offer.status !== "open" || !offer.expiresAt) return offer;
  if (new Date(offer.expiresAt) > new Date()) return offer;
  const expired = await offerRepository.markExpiredIfOpen(offer._id.toString());
  if (expired) {
    audit({
      action: "offer.expired",
      resourceType: "offer",
      resourceId: offer._id.toString(),
    });
    return expired;
  }
  return { ...offer, status: "expired" };
}

async function toStudioDto(offer: IOffer, beat?: IBeat | null): Promise<StudioOfferDto> {
  const resolved =
    beat ?? (await beatRepository.findById(offer.beatId.toString()));
  return toStudioOfferDto(offer, resolved);
}

export const offerService = withFeatureFlag("customOffers", {
  async requestOffer(
    input: RequestOfferInput,
    actor: { userId?: string; userEmail?: string } = {}
  ): Promise<IOffer> {
    const beat = await beatRepository.findById(input.beatId);
    assertBeatPurchasable(beat, undefined, { accessToken: input.accessToken });

    const requesterEmail = (actor.userEmail || input.email || "").trim().toLowerCase();
    if (!requesterEmail) {
      throw new ValidationError("Email is required", { email: ["Email is required"] });
    }

    const offer = await offerRepository.create({
      producerId: beat.producerId,
      beatId: input.beatId as unknown as IOffer["beatId"],
      status: "pending_request",
      requestedByUserId: actor.userId as unknown as IOffer["requestedByUserId"],
      requesterEmail,
      requesterNote: input.note,
    });

    const producer = await userRepository.findById(beat.producerId.toString());
    if (producer?.email) {
      emailService
        .sendOfferRequestNotification({
          to: producer.email,
          producerName: producer.displayName || producer.name,
          beatTitle: beat.title,
          requesterEmail,
          note: input.note,
        })
        .catch((error) => {
          logger.warn("Offer request email failed", {
            offerId: offer._id,
            error: error instanceof Error ? error.message : String(error),
          });
        });
    }

    audit({
      action: "offer.requested",
      userId: actor.userId,
      resourceType: "offer",
      resourceId: offer._id.toString(),
      metadata: { beatId: input.beatId },
    });

    return offer;
  },

  async createOffer(producerId: string, input: CreateOfferInput): Promise<StudioOfferDto> {
    const beat = await requireOwnedPublishedBeat(input.beatId, producerId);

    const licenseSnapshot = await buildLicenseSnapshot(input.beatId, input.licenseType);
    const token = generateOfferToken();
    const expiresAt = new Date(Date.now() + input.expiresInHours * 60 * 60 * 1000);
    const buyerEmail = input.buyerEmail?.trim().toLowerCase();

    const fields: Partial<IOffer> = {
      token,
      status: "open",
      licenseType: input.licenseType,
      licenseSnapshot,
      amount: input.amount,
      expiresAt,
      requesterNote: input.note,
    };
    if (buyerEmail) fields.requesterEmail = buyerEmail;

    let offer: IOffer | null = null;
    if (input.requestId) {
      offer = await offerRepository.convertRequest(input.requestId, producerId, {
        ...fields,
        beatId: input.beatId as unknown as IOffer["beatId"],
      });
      if (!offer) {
        throw new ConflictError("This request is no longer available to convert");
      }
    } else {
      offer = await offerRepository.create({
        producerId: producerId as unknown as IOffer["producerId"],
        beatId: input.beatId as unknown as IOffer["beatId"],
        ...fields,
      });
    }

    audit({
      action: "offer.created",
      userId: producerId,
      resourceType: "offer",
      resourceId: offer._id.toString(),
      metadata: { beatId: input.beatId, amount: input.amount, licenseType: input.licenseType },
    });

    return toStudioDto(offer, beat);
  },

  async list(
    producerId: string,
    tab: OfferListTab,
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<StudioOfferDto>> {
    if (tab === "open") {
      await offerRepository.markExpiredForProducer(producerId);
    }

    const result = await offerRepository.findByProducer(
      producerId,
      OFFER_TAB_STATUSES[tab],
      page,
      limit
    );
    const beatIds = [...new Set(result.data.map((o) => o.beatId.toString()))];
    const beats = beatIds.length > 0 ? await beatRepository.findByIds(beatIds) : [];
    const beatMap = new Map(beats.map((b) => [b._id.toString(), b]));

    return {
      ...result,
      data: result.data.map((offer) =>
        toStudioOfferDto(offer, beatMap.get(offer.beatId.toString()) ?? null)
      ),
    };
  },

  async withdraw(producerId: string, offerId: string): Promise<StudioOfferDto> {
    const offer = await offerRepository.withdrawIfOwned(offerId, producerId);
    if (!offer) {
      const existing = await offerRepository.findById(offerId);
      if (!existing) throw new NotFoundError("Offer");
      if (existing.producerId.toString() !== producerId) {
        throw new ForbiddenError("You can only withdraw your own offers");
      }
      throw new ConflictError("This offer can no longer be withdrawn");
    }

    audit({
      action: "offer.withdrawn",
      userId: producerId,
      resourceType: "offer",
      resourceId: offer._id.toString(),
    });

    return toStudioDto(offer);
  },

  async getPublicByToken(token: string): Promise<PublicOfferDto | null> {
    const found = await offerRepository.findByToken(token);
    if (!found) return null;
    if (found.status === "pending_request" || found.status === "withdrawn") return null;

    const offer = await expireIfNeeded(found);
    if (offer.status === "pending_request" || offer.status === "withdrawn") return null;

    const priced = asPricedOffer(offer);
    if (!priced) return null;

    const beat = await beatRepository.findById(offer.beatId.toString());
    if (!beat) return null;
    const producer = await userRepository.findById(beat.producerId.toString());

    return toPublicOfferDto(
      priced,
      beat,
      producer?.displayName || producer?.name || "Producer"
    );
  },

  async requireOpenOffer(token: string): Promise<{ offer: OpenOffer; beat: IBeat }> {
    const found = await offerRepository.findByToken(token);
    if (!found) throw new NotFoundError("Offer");

    const offer = await expireIfNeeded(found);
    if (offer.status === "expired") {
      throw new ConflictError("This offer has expired");
    }

    const open = asOpenOffer(offer);
    if (!open) {
      throw new ConflictError("This offer is no longer available");
    }

    const beat = await beatRepository.findById(open.beatId.toString());
    assertBeatLicensable(beat);

    return { offer: open, beat };
  },

  async acceptForOrder(
    offerId: string,
    orderId: string,
    actor: { buyerId?: string },
    options: SessionOptions = {}
  ): Promise<{ licenseType: BeatLicenseType; snapshot: IOfferLicenseSnapshot }> {
    const offer = await offerRepository.findById(offerId, options);
    if (!offer) throw new NotFoundError("Offer");

    if (offer.status === "accepted") {
      if (offer.acceptedOrderId?.toString() !== orderId) {
        throw new ConflictError("This offer has already been accepted");
      }
    } else {
      const accepted = await offerRepository.acceptIfOpen(
        offerId,
        { acceptedOrderId: orderId },
        options
      );
      if (!accepted) {
        throw new ConflictError("This offer has already been accepted");
      }
      audit({
        action: "offer.accepted",
        userId: actor.buyerId,
        resourceType: "offer",
        resourceId: offerId,
        metadata: { orderId, beatId: offer.beatId.toString() },
      });
    }

    if (!offer.licenseSnapshot || !offer.licenseType) {
      throw new ConflictError("Offer is missing license terms");
    }

    return { licenseType: offer.licenseType, snapshot: offer.licenseSnapshot };
  },

  async attachAcceptedPurchase(
    offerId: string,
    purchaseId: string,
    options: SessionOptions = {}
  ): Promise<void> {
    await offerRepository.setAcceptedPurchaseId(offerId, purchaseId, options);
  },
});
