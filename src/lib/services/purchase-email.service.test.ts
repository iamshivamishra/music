import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/repositories/beat.repository", () => ({
  beatRepository: { findByIds: vi.fn() },
}));

vi.mock("@/lib/repositories/pack.repository", () => ({
  packRepository: { findByIds: vi.fn() },
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: { findByIds: vi.fn() },
}));

vi.mock("@/lib/repositories/earning.repository", () => ({
  earningRepository: { findByPurchaseIds: vi.fn().mockResolvedValue([]) },
}));

vi.mock("@/lib/services/email.service", () => ({
  emailService: {
    sendPurchaseConfirmation: vi.fn(),
    sendSaleNotification: vi.fn(),
  },
}));

vi.mock("@/lib/services/storage.service", () => ({
  storageService: {
    getDownloadUrlForValue: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { beatRepository } from "@/lib/repositories/beat.repository";
import { packRepository } from "@/lib/repositories/pack.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { emailService } from "@/lib/services/email.service";
import { storageService } from "@/lib/services/storage.service";
import { purchaseEmailService } from "./purchase-email.service";
import type { IOrder, IPurchase } from "@/types";

const producer = {
  _id: "prod_1",
  name: "Producer X",
  displayName: "ProducerX",
  email: "producer@example.com",
};

function beatOrder(overrides: Partial<IOrder> = {}): IOrder {
  return {
    _id: "order_1",
    receipt: "rcpt_abc123",
    totalAmount: 1499,
    razorpayPaymentId: "pay_1",
    paidAt: new Date("2026-09-03"),
    items: [
      {
        beatId: "beat_1",
        licenseId: "lic_1",
        licenseType: "premium",
        price: 1499,
        beatTitle: "Dark Trap Melody",
      },
    ],
    status: "paid",
    ...overrides,
  } as IOrder;
}

function purchase(overrides: Partial<IPurchase> = {}): IPurchase {
  return {
    _id: "purchase_1",
    beatId: "beat_1",
    licenseType: "premium",
    includesWav: true,
    includesStems: false,
    amount: 1499,
    orderId: "rzp_1",
    paymentId: "pay_1",
    ...overrides,
  } as IPurchase;
}

describe("purchaseEmailService.notifyOrderFulfilled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(beatRepository.findByIds).mockResolvedValue([
      {
        _id: "beat_1",
        title: "Dark Trap Melody",
        producerId: "prod_1",
        storageKeys: { master: "keys/master.wav", stems: "keys/stems.zip" },
        audioFullUrl: "https://cdn.example.com/master.wav",
        stemsUrl: "https://cdn.example.com/stems.zip",
      },
    ] as never);
    vi.mocked(packRepository.findByIds).mockResolvedValue([]);
    vi.mocked(userRepository.findByIds).mockResolvedValue([producer] as never);
    vi.mocked(storageService.getDownloadUrlForValue).mockImplementation(async (value: string) => {
      return `https://signed.example.com/${value}`;
    });
    vi.mocked(emailService.sendPurchaseConfirmation).mockResolvedValue(undefined);
    vi.mocked(emailService.sendSaleNotification).mockResolvedValue(undefined);
  });

  it("does not sign WAV when the purchase is not entitled", async () => {
    await purchaseEmailService.notifyOrderFulfilled({
      order: beatOrder({
        items: [
          {
            beatId: "beat_1",
            licenseType: "basic",
            price: 499,
            beatTitle: "Dark Trap Melody",
          },
        ],
        totalAmount: 499,
      }),
      purchases: [purchase({ includesWav: false, includesStems: false, licenseType: "basic" })],
      buyerEmail: "buyer@example.com",
      buyerName: "Ada Lovelace",
    });

    expect(storageService.getDownloadUrlForValue).not.toHaveBeenCalled();
    expect(emailService.sendPurchaseConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "rcpt_abc123",
        accessCtaLabel: "Access Your Library",
        accessUrl: "https://trishulbeats.com/profile/library",
        items: [
          expect.objectContaining({
            licenseName: "Basic License",
            downloads: [],
            licensePdfUrl: expect.stringContaining("/api/purchases/purchase_1/license-pdf"),
          }),
        ],
      })
    );
  });

  it("signs WAV and stems when entitled", async () => {
    await purchaseEmailService.notifyOrderFulfilled({
      order: beatOrder({
        items: [
          {
            beatId: "beat_1",
            licenseType: "unlimited",
            price: 9999,
            beatTitle: "Dark Trap Melody",
          },
        ],
        totalAmount: 9999,
      }),
      purchases: [purchase({ includesWav: true, includesStems: true, licenseType: "unlimited" })],
      buyerEmail: "buyer@example.com",
      buyerName: "Ada",
    });

    expect(storageService.getDownloadUrlForValue).toHaveBeenCalledWith(
      "keys/master.wav",
      { expiresInSeconds: 86400 }
    );
    expect(storageService.getDownloadUrlForValue).toHaveBeenCalledWith(
      "keys/stems.zip",
      { expiresInSeconds: 86400 }
    );
    const items = vi.mocked(emailService.sendPurchaseConfirmation).mock.calls[0][0].items;
    expect(items[0].downloads.map((d) => d.label)).toEqual(["Download WAV", "Download Stems"]);
    expect(items[0].licenseName).toBe("Unlimited License");
  });

  it("does not sign pack files and groups producer notifications", async () => {
    vi.mocked(beatRepository.findByIds).mockResolvedValue([]);
    vi.mocked(packRepository.findByIds).mockResolvedValue([
      {
        _id: "pack_1",
        title: "Trap Pack",
        producerId: "prod_1",
        beats: [{ beatId: "beat_a", position: 0 }, { beatId: "beat_b", position: 1 }],
      },
    ] as never);

    await purchaseEmailService.notifyOrderFulfilled({
      order: beatOrder({
        items: [
          {
            packId: "pack_1",
            packTier: "premium",
            packTitle: "Trap Pack",
            price: 2999,
          },
        ],
        totalAmount: 2999,
      }),
      purchases: [purchase({ _id: "pack_purchase", packId: "pack_1", beatId: undefined })],
      buyerEmail: "buyer@example.com",
      buyerName: "Ada",
    });

    expect(storageService.getDownloadUrlForValue).not.toHaveBeenCalled();
    expect(emailService.sendPurchaseConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            beatTitle: "Trap Pack",
            licenseName: "Premium Pack",
            downloads: [],
            packBeatCount: 2,
          }),
        ],
      })
    );
    expect(emailService.sendSaleNotification).toHaveBeenCalledTimes(1);
    expect(emailService.sendSaleNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "producer@example.com",
        items: [expect.objectContaining({ beatTitle: "Trap Pack", licenseName: "Premium Pack" })],
      })
    );
  });

  it("omits license PDF links for guests", async () => {
    await purchaseEmailService.notifyOrderFulfilled({
      order: beatOrder(),
      purchases: [purchase()],
      buyerEmail: "guest@example.com",
      buyerName: "Guest",
      guestDownloadToken: "tok",
    });

    const items = vi.mocked(emailService.sendPurchaseConfirmation).mock.calls[0][0].items;
    expect(items[0].licensePdfUrl).toBeUndefined();
    expect(emailService.sendPurchaseConfirmation).toHaveBeenCalledWith(
      expect.objectContaining({
        accessUrl: "https://trishulbeats.com/download/tok",
        accessCtaLabel: "Download Your Beats",
      })
    );
  });

  it("swallows send failures", async () => {
    vi.mocked(emailService.sendPurchaseConfirmation).mockRejectedValueOnce(new Error("resend down"));
    vi.mocked(emailService.sendSaleNotification).mockRejectedValueOnce(new Error("resend down"));

    await expect(
      purchaseEmailService.notifyOrderFulfilled({
        order: beatOrder(),
        purchases: [purchase()],
        buyerEmail: "buyer@example.com",
        buyerName: "Ada",
      })
    ).resolves.toBeUndefined();
  });
});
