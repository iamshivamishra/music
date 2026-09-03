import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";

vi.mock("@/lib/repositories/offer.repository", () => ({
  offerRepository: {
    create: vi.fn(),
    findById: vi.fn(),
    findByToken: vi.fn(),
    findByProducer: vi.fn(),
    convertRequest: vi.fn(),
    acceptIfOpen: vi.fn(),
    setAcceptedPurchaseId: vi.fn(),
    markExpiredIfOpen: vi.fn(),
    markExpiredForProducer: vi.fn(),
    withdrawIfOwned: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/beat.repository", () => ({
  beatRepository: {
    findById: vi.fn(),
    findByIds: vi.fn(),
    findByProducerId: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/license.repository", () => ({
  licenseRepository: {
    findActiveByBeatAndType: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/services/email.service", () => ({
  emailService: {
    sendOfferRequestNotification: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/audit", () => ({
  audit: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/app-url", () => ({
  getAppUrl: () => "https://trishulbeats.com",
}));

import { offerRepository } from "@/lib/repositories/offer.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { offerService } from "./offer.service";

const publishedBeat = {
  _id: "beat_1",
  title: "Midnight",
  producerId: "prod_1",
  isPublished: true,
  status: "published",
  genre: "Hip Hop",
  coverUrl: "/cover.jpg",
};

function openOffer(overrides: Record<string, unknown> = {}) {
  return {
    _id: "offer_1",
    producerId: "prod_1",
    beatId: "beat_1",
    token: "abc123token",
    status: "open",
    licenseType: "unlimited",
    amount: 8000,
    expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    licenseSnapshot: {
      name: "Unlimited License",
      includesWav: true,
      includesStems: true,
      commercialUse: true,
      streamLimit: -1,
      terms: "Full commercial rights.",
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("offerService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("requestOffer", () => {
    it("creates a pending_request for a published beat", async () => {
      vi.mocked(beatRepository.findById).mockResolvedValue(publishedBeat as never);
      vi.mocked(offerRepository.create).mockResolvedValue({
        _id: "req_1",
        status: "pending_request",
      } as never);
      vi.mocked(userRepository.findById).mockResolvedValue({
        email: "prod@example.com",
        name: "Producer",
      } as never);

      const result = await offerService.requestOffer({
        beatId: "beat_1",
        note: "₹8k exclusive",
        email: "buyer@example.com",
      });

      expect(result._id).toBe("req_1");
      expect(offerRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "pending_request",
          requesterEmail: "buyer@example.com",
        })
      );
    });

    it("requires email for guests", async () => {
      vi.mocked(beatRepository.findById).mockResolvedValue(publishedBeat as never);
      await expect(offerService.requestOffer({ beatId: "beat_1" })).rejects.toBeInstanceOf(
        ValidationError
      );
    });
  });

  describe("createOffer", () => {
    it("snapshots catalog license when present", async () => {
      vi.mocked(beatRepository.findById).mockResolvedValue(publishedBeat as never);
      vi.mocked(licenseRepository.findActiveByBeatAndType).mockResolvedValue({
        name: "Custom Unlimited",
        includesWav: true,
        includesStems: true,
        commercialUse: true,
        streamLimit: -1,
        terms: "Producer terms",
      } as never);
      vi.mocked(offerRepository.create).mockResolvedValue(openOffer() as never);

      await offerService.createOffer("prod_1", {
        beatId: "beat_1",
        licenseType: "unlimited",
        amount: 8000,
        expiresInHours: 48,
      });

      expect(offerRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          status: "open",
          amount: 8000,
          licenseSnapshot: expect.objectContaining({ name: "Custom Unlimited" }),
        })
      );
    });

    it("falls back to LICENSE_DEFAULTS when no catalog row exists", async () => {
      vi.mocked(beatRepository.findById).mockResolvedValue(publishedBeat as never);
      vi.mocked(licenseRepository.findActiveByBeatAndType).mockResolvedValue(null);
      vi.mocked(offerRepository.create).mockResolvedValue(openOffer() as never);

      await offerService.createOffer("prod_1", {
        beatId: "beat_1",
        licenseType: "exclusive",
        amount: 25000,
        expiresInHours: 24,
      });

      expect(offerRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          licenseType: "exclusive",
          licenseSnapshot: expect.objectContaining({ name: "Exclusive Rights" }),
        })
      );
    });

    it("rejects another producer's beat", async () => {
      vi.mocked(beatRepository.findById).mockResolvedValue(publishedBeat as never);
      await expect(
        offerService.createOffer("other_prod", {
          beatId: "beat_1",
          licenseType: "basic",
          amount: 500,
          expiresInHours: 48,
        })
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it("rejects exclusive-already-sold beats", async () => {
      vi.mocked(beatRepository.findById).mockResolvedValue({
        ...publishedBeat,
        exclusiveBuyerId: "buyer_x",
      } as never);

      await expect(
        offerService.createOffer("prod_1", {
          beatId: "beat_1",
          licenseType: "exclusive",
          amount: 10000,
          expiresInHours: 48,
        })
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("converts a pending request instead of inserting a duplicate", async () => {
      vi.mocked(beatRepository.findById).mockResolvedValue(publishedBeat as never);
      vi.mocked(licenseRepository.findActiveByBeatAndType).mockResolvedValue(null);
      vi.mocked(offerRepository.convertRequest).mockResolvedValue(openOffer() as never);

      await offerService.createOffer("prod_1", {
        beatId: "beat_1",
        licenseType: "unlimited",
        amount: 8000,
        expiresInHours: 48,
        requestId: "req_1",
      });

      expect(offerRepository.convertRequest).toHaveBeenCalled();
      expect(offerRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("withdraw", () => {
    it("withdraws an open offer", async () => {
      vi.mocked(offerRepository.withdrawIfOwned).mockResolvedValue(
        openOffer({ status: "withdrawn" }) as never
      );
      vi.mocked(beatRepository.findById).mockResolvedValue(publishedBeat as never);
      const result = await offerService.withdraw("prod_1", "offer_1");
      expect(result.status).toBe("withdrawn");
      expect(result.beat.title).toBe("Midnight");
    });

    it("forbids withdrawing another producer's offer", async () => {
      vi.mocked(offerRepository.withdrawIfOwned).mockResolvedValue(null);
      vi.mocked(offerRepository.findById).mockResolvedValue(openOffer() as never);
      await expect(offerService.withdraw("other", "offer_1")).rejects.toBeInstanceOf(
        ForbiddenError
      );
    });
  });

  describe("getPublicByToken / requireOpenOffer", () => {
    it("lazy-marks expired open offers", async () => {
      const expired = openOffer({ expiresAt: new Date(Date.now() - 1000) });
      vi.mocked(offerRepository.findByToken).mockResolvedValue(expired as never);
      vi.mocked(offerRepository.markExpiredIfOpen).mockResolvedValue({
        ...expired,
        status: "expired",
      } as never);
      vi.mocked(beatRepository.findById).mockResolvedValue(publishedBeat as never);
      vi.mocked(userRepository.findById).mockResolvedValue({
        displayName: "Prod",
        name: "Prod",
      } as never);

      const dto = await offerService.getPublicByToken("abc123token");
      expect(dto?.status).toBe("expired");
      expect(dto).not.toHaveProperty("requesterEmail");
    });

    it("returns null for pending_request tokens", async () => {
      vi.mocked(offerRepository.findByToken).mockResolvedValue(
        openOffer({ status: "pending_request", token: undefined }) as never
      );
      await expect(offerService.getPublicByToken("x")).resolves.toBeNull();
    });

    it("requireOpenOffer throws after expiry", async () => {
      const expired = openOffer({ expiresAt: new Date(Date.now() - 1000) });
      vi.mocked(offerRepository.findByToken).mockResolvedValue(expired as never);
      vi.mocked(offerRepository.markExpiredIfOpen).mockResolvedValue({
        ...expired,
        status: "expired",
      } as never);

      await expect(offerService.requireOpenOffer("abc123token")).rejects.toBeInstanceOf(
        ConflictError
      );
    });

    it("requireOpenOffer 404s unknown tokens", async () => {
      vi.mocked(offerRepository.findByToken).mockResolvedValue(null);
      await expect(offerService.requireOpenOffer("missing")).rejects.toBeInstanceOf(NotFoundError);
    });

    it("requireOpenOffer returns the beat so checkout does not reload it", async () => {
      vi.mocked(offerRepository.findByToken).mockResolvedValue(openOffer() as never);
      vi.mocked(beatRepository.findById).mockResolvedValue(publishedBeat as never);

      const result = await offerService.requireOpenOffer("abc123token");
      expect(result.offer.amount).toBe(8000);
      expect(result.beat.title).toBe("Midnight");
    });
  });

  describe("acceptForOrder", () => {
    it("accepts an open offer once", async () => {
      vi.mocked(offerRepository.findById).mockResolvedValue(openOffer() as never);
      vi.mocked(offerRepository.acceptIfOpen).mockResolvedValue({ status: "accepted" } as never);

      const result = await offerService.acceptForOrder("offer_1", "order_1", {
        buyerId: "buyer_1",
      });

      expect(result.licenseType).toBe("unlimited");
      expect(result.snapshot.name).toBe("Unlimited License");
      expect(offerRepository.acceptIfOpen).toHaveBeenCalled();
    });

    it("rejects a second order after the offer is accepted", async () => {
      vi.mocked(offerRepository.findById).mockResolvedValue(
        openOffer({ status: "accepted", acceptedOrderId: "order_1" }) as never
      );

      await expect(
        offerService.acceptForOrder("offer_1", "order_2", { buyerId: "buyer_2" })
      ).rejects.toBeInstanceOf(ConflictError);
      expect(offerRepository.acceptIfOpen).not.toHaveBeenCalled();
    });
  });
});
