import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IUser } from "@/types";

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/app-url", () => ({
  getAppUrl: () => "https://trishulbeats.com",
}));

vi.mock("@/lib/whatsapp", () => ({
  whatsappClient: {
    isConfigured: vi.fn(),
    sendTemplate: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/notification-log.repository", () => ({
  notificationLogRepository: {
    existsForOrder: vi.fn(),
    countTodayByProducer: vi.fn(),
    create: vi.fn(),
    markSent: vi.fn(),
    markFailed: vi.fn(),
  },
}));

import { whatsappClient } from "@/lib/whatsapp";
import { userRepository } from "@/lib/repositories/user.repository";
import { notificationLogRepository } from "@/lib/repositories/notification-log.repository";
import { whatsappService } from "./whatsapp.service";

const PRODUCER_ID = "64b1f1c2a1b2c3d4e5f60708";
const ORDER_ID = "order_abc123";

const payload = {
  orderId: ORDER_ID,
  beatTitle: "Midnight Drill",
  licenseName: "Premium",
  grossAmount: 2499,
};

function makeProducer(overrides: Partial<IUser> = {}): IUser {
  return {
    _id: PRODUCER_ID,
    name: "Sandeep",
    email: "sandeep@example.com",
    role: "producer",
    displayName: "Sandeep",
    socialLinks: { whatsappNumber: "9876543210" },
    notificationPrefs: {
      saleWhatsApp: true,
      dropWhatsApp: false,
      saleEmail: true,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("whatsappService.notifySale", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(whatsappClient.isConfigured).mockReturnValue(true);
    vi.mocked(userRepository.findById).mockResolvedValue(makeProducer());
    vi.mocked(notificationLogRepository.existsForOrder).mockResolvedValue(false);
    vi.mocked(notificationLogRepository.countTodayByProducer).mockResolvedValue(0);
    vi.mocked(notificationLogRepository.create).mockResolvedValue({
      _id: "log_1",
    } as never);
    vi.mocked(whatsappClient.sendTemplate).mockResolvedValue({
      success: true,
      messageId: "wamid_1",
    });
  });

  it("skips when the WhatsApp provider is not configured", async () => {
    vi.mocked(whatsappClient.isConfigured).mockReturnValue(false);

    await whatsappService.notifySale(PRODUCER_ID, payload);

    expect(userRepository.findById).not.toHaveBeenCalled();
    expect(whatsappClient.sendTemplate).not.toHaveBeenCalled();
  });

  it("skips when sale alerts are disabled", async () => {
    vi.mocked(userRepository.findById).mockResolvedValueOnce(
      makeProducer({
        notificationPrefs: {
          saleWhatsApp: false,
          dropWhatsApp: false,
          saleEmail: true,
        },
      })
    );

    await whatsappService.notifySale(PRODUCER_ID, payload);

    expect(whatsappClient.sendTemplate).not.toHaveBeenCalled();
  });

  it("skips when the producer has no WhatsApp number", async () => {
    vi.mocked(userRepository.findById).mockResolvedValueOnce(
      makeProducer({ socialLinks: {} })
    );

    await whatsappService.notifySale(PRODUCER_ID, payload);

    expect(whatsappClient.sendTemplate).not.toHaveBeenCalled();
  });

  it("is idempotent for a duplicate order", async () => {
    vi.mocked(notificationLogRepository.existsForOrder).mockResolvedValueOnce(true);

    await whatsappService.notifySale(PRODUCER_ID, payload);

    expect(whatsappClient.sendTemplate).not.toHaveBeenCalled();
    expect(notificationLogRepository.create).not.toHaveBeenCalled();
  });

  it("skips and logs when the daily rate limit is reached", async () => {
    vi.mocked(notificationLogRepository.countTodayByProducer).mockResolvedValueOnce(20);

    await whatsappService.notifySale(PRODUCER_ID, payload);

    expect(whatsappClient.sendTemplate).not.toHaveBeenCalled();
    expect(notificationLogRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        producerId: PRODUCER_ID,
        kind: "sale",
        status: "skipped",
      })
    );
  });

  it("sends the sale template and marks the log sent", async () => {
    await whatsappService.notifySale(PRODUCER_ID, payload);

    expect(whatsappClient.sendTemplate).toHaveBeenCalledWith({
      to: "9876543210",
      templateName: "sale_alert_v1",
      bodyParams: [
        "Sandeep",
        "Midnight Drill",
        "Premium",
        "2,499",
        "https://trishulbeats.com/studio/payouts",
      ],
    });
    expect(notificationLogRepository.markSent).toHaveBeenCalledWith("log_1", "wamid_1");
  });

  it("marks the log failed when the provider returns an error", async () => {
    vi.mocked(whatsappClient.sendTemplate).mockResolvedValueOnce({
      success: false,
      error: "template not approved",
    });

    await whatsappService.notifySale(PRODUCER_ID, payload);

    expect(notificationLogRepository.markFailed).toHaveBeenCalledWith(
      "log_1",
      "template not approved"
    );
  });

  it("swallows unexpected errors", async () => {
    vi.mocked(userRepository.findById).mockRejectedValueOnce(new Error("db down"));

    await expect(whatsappService.notifySale(PRODUCER_ID, payload)).resolves.toBeUndefined();
    expect(whatsappClient.sendTemplate).not.toHaveBeenCalled();
  });
});

describe("whatsappService.notifyDropPublished", () => {
  it("is a no-op in v1", async () => {
    await expect(
      whatsappService.notifyDropPublished(PRODUCER_ID, "beat_1")
    ).resolves.toBeUndefined();
  });
});
