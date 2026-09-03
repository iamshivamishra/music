import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/repositories/order.repository", () => ({
  orderRepository: {
    markPaidIfPending: vi.fn(),
    findById: vi.fn(),
    setDownloadToken: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/purchase.repository", () => ({
  purchaseRepository: {
    create: vi.fn(),
    findByBuyerAndOrderId: vi.fn(),
    findByOrderId: vi.fn(),
    findByBuyerAndBeat: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/license.repository", () => ({
  licenseRepository: { findById: vi.fn(), deactivateAllForBeat: vi.fn() },
}));

vi.mock("@/lib/repositories/beat.repository", () => ({
  beatRepository: {
    findById: vi.fn(),
    incrementSalesCount: vi.fn(),
    markExclusive: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/pack.repository", () => ({
  packRepository: { findById: vi.fn() },
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: {
    findById: vi.fn(),
    incrementSalesCount: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/cart.repository", () => ({
  cartRepository: { clear: vi.fn() },
}));

vi.mock("@/lib/repositories/earning.repository", () => ({
  earningRepository: { insertShares: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@/lib/services/coupon.service", () => ({
  couponService: { recordUsage: vi.fn() },
}));

vi.mock("@/lib/services/pdf.service", () => ({
  pdfService: { persistLicenseIdentifiers: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@/lib/services/purchase-email.service", () => ({
  purchaseEmailService: {
    notifyOrderFulfilled: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/db", () => ({
  withTransaction: vi.fn(async (operation: (session: unknown) => Promise<unknown>) =>
    operation({})
  ),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/audit", () => ({
  audit: vi.fn(),
}));

vi.mock("@/lib/services/service-job.service", () => ({
  serviceJobService: {
    onPaymentCaptured: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/services/offer.service", () => ({
  offerService: {
    acceptForOrder: vi.fn(),
    attachAcceptedPurchase: vi.fn(),
  },
}));

vi.mock("@/lib/services/whatsapp.service", () => ({
  whatsappService: { notifySale: vi.fn().mockResolvedValue(undefined) },
}));

import { orderRepository } from "@/lib/repositories/order.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { earningRepository } from "@/lib/repositories/earning.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { cartRepository } from "@/lib/repositories/cart.repository";
import { purchaseEmailService } from "@/lib/services/purchase-email.service";
import { offerService } from "@/lib/services/offer.service";
import { orderFulfillmentService } from "./order-fulfillment";

function pendingBeatOrder(overrides: Record<string, unknown> = {}) {
  return {
    _id: "order_1",
    buyerId: "buyer_1",
    status: "pending",
    totalAmount: 999,
    razorpayOrderId: "rzp_1",
    receipt: "rcpt_1",
    items: [
      {
        beatId: "beat_1",
        licenseId: "license_1",
        licenseType: "basic",
        price: 999,
        beatTitle: "Track",
      },
    ],
    ...overrides,
  };
}

describe("orderFulfillmentService email gating", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userRepository.findById).mockResolvedValue({
      _id: "buyer_1",
      email: "buyer@example.com",
      name: "Ada",
    } as never);
    vi.mocked(cartRepository.clear).mockResolvedValue(undefined as never);
  });

  it("does not notify when the order was already paid", async () => {
    vi.mocked(orderRepository.markPaidIfPending).mockResolvedValueOnce(null);
    vi.mocked(orderRepository.findById).mockResolvedValueOnce({
      ...pendingBeatOrder(),
      status: "paid",
    } as never);
    vi.mocked(purchaseRepository.findByBuyerAndOrderId).mockResolvedValueOnce([
      { _id: "p1" },
    ] as never);

    const result = await orderFulfillmentService.fulfillOrder(
      pendingBeatOrder() as never,
      "pay_1"
    );

    expect(result.newlyPaid).toBe(false);
    expect(purchaseEmailService.notifyOrderFulfilled).not.toHaveBeenCalled();
  });

  it("notifies after a newly paid logged-in order", async () => {
    const paid = { ...pendingBeatOrder(), status: "paid" };
    vi.mocked(orderRepository.markPaidIfPending).mockResolvedValueOnce(paid as never);
    vi.mocked(beatRepository.findById).mockResolvedValue({
      _id: "beat_1",
      isPublished: true,
      status: "published",
      producerId: "prod_1",
    } as never);
    vi.mocked(licenseRepository.findById).mockResolvedValueOnce({
      _id: "license_1",
      isActive: true,
      beatId: "beat_1",
      includesWav: false,
      includesStems: false,
    } as never);
    vi.mocked(purchaseRepository.create).mockResolvedValueOnce({
      _id: "p1",
      beatId: "beat_1",
      amount: 999,
      producerId: "prod_1",
    } as never);
    vi.mocked(beatRepository.incrementSalesCount).mockResolvedValue(undefined as never);
    vi.mocked(userRepository.incrementSalesCount).mockResolvedValue(undefined as never);

    const result = await orderFulfillmentService.fulfillOrder(
      pendingBeatOrder() as never,
      "pay_1"
    );

    expect(result.newlyPaid).toBe(true);
    expect(purchaseRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ producerId: "prod_1" }),
      expect.anything()
    );
    expect(earningRepository.insertShares).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          producerId: "prod_1",
          grossAmount: 999,
          sharePercent: 100,
        }),
      ]),
      expect.anything()
    );
    await vi.waitFor(() => {
      expect(purchaseEmailService.notifyOrderFulfilled).toHaveBeenCalled();
    });
    expect(purchaseEmailService.notifyOrderFulfilled).toHaveBeenCalledWith(
      expect.objectContaining({
        buyerEmail: "buyer@example.com",
      })
    );
    expect(
      vi.mocked(purchaseEmailService.notifyOrderFulfilled).mock.calls[0][0].guestDownloadToken
    ).toBeUndefined();
  });

  it("fulfills an unlisted beat after payment succeeds", async () => {
    const paid = { ...pendingBeatOrder(), status: "paid" };
    vi.mocked(orderRepository.markPaidIfPending).mockResolvedValueOnce(paid as never);
    vi.mocked(beatRepository.findById).mockResolvedValue({
      _id: "beat_1",
      isPublished: false,
      status: "unlisted",
      producerId: "prod_1",
      privateToken: "secret-token",
    } as never);
    vi.mocked(licenseRepository.findById).mockResolvedValueOnce({
      _id: "license_1",
      isActive: true,
      beatId: "beat_1",
      includesWav: false,
      includesStems: false,
    } as never);
    vi.mocked(purchaseRepository.create).mockResolvedValueOnce({
      _id: "p1",
      beatId: "beat_1",
      amount: 999,
      producerId: "prod_1",
    } as never);
    vi.mocked(beatRepository.incrementSalesCount).mockResolvedValue(undefined as never);
    vi.mocked(userRepository.incrementSalesCount).mockResolvedValue(undefined as never);

    const result = await orderFulfillmentService.fulfillOrder(
      pendingBeatOrder() as never,
      "pay_1"
    );

    expect(result.newlyPaid).toBe(true);
    expect(purchaseRepository.create).toHaveBeenCalled();
  });

  it("does not await guest notify and uses the download token URL", async () => {
    let resolveNotify: () => void = () => {};
    const notifyPending = new Promise<void>((resolve) => {
      resolveNotify = resolve;
    });
    vi.mocked(purchaseEmailService.notifyOrderFulfilled).mockReturnValueOnce(notifyPending);

    const guestOrder = pendingBeatOrder({
      buyerId: undefined,
      guestEmail: "guest@example.com",
      guestName: "Guest",
    });
    vi.mocked(orderRepository.markPaidIfPending).mockResolvedValueOnce({
      ...guestOrder,
      status: "paid",
    } as never);
    vi.mocked(beatRepository.findById).mockResolvedValueOnce({
      _id: "beat_1",
      isPublished: true,
      status: "published",
      producerId: "prod_1",
    } as never);
    vi.mocked(licenseRepository.findById).mockResolvedValueOnce({
      _id: "license_1",
      isActive: true,
      beatId: "beat_1",
      includesWav: true,
      includesStems: false,
    } as never);
    vi.mocked(purchaseRepository.create).mockResolvedValueOnce({ _id: "p1" } as never);
    vi.mocked(beatRepository.incrementSalesCount).mockResolvedValue(undefined as never);
    vi.mocked(userRepository.incrementSalesCount).mockResolvedValue(undefined as never);
    vi.mocked(orderRepository.setDownloadToken).mockResolvedValueOnce({} as never);

    const result = await orderFulfillmentService.fulfillGuestOrder(
      guestOrder as never,
      "pay_1"
    );

    expect(result.newlyPaid).toBe(true);
    expect(result.downloadToken).toBeTruthy();
    await vi.waitFor(() => {
      expect(purchaseEmailService.notifyOrderFulfilled).toHaveBeenCalled();
    });
    expect(purchaseEmailService.notifyOrderFulfilled).toHaveBeenCalledWith(
      expect.objectContaining({
        buyerEmail: "guest@example.com",
        guestDownloadToken: result.downloadToken,
      })
    );

    resolveNotify();
  });

  it("does not notify guest orders on re-entry", async () => {
    vi.mocked(orderRepository.markPaidIfPending).mockResolvedValueOnce(null);
    vi.mocked(orderRepository.findById).mockResolvedValueOnce({
      ...pendingBeatOrder({ guestEmail: "guest@example.com" }),
      status: "paid",
    } as never);
    vi.mocked(purchaseRepository.findByOrderId).mockResolvedValueOnce([{ _id: "p1" }] as never);

    const result = await orderFulfillmentService.fulfillGuestOrder(
      pendingBeatOrder({ buyerId: undefined, guestEmail: "guest@example.com" }) as never,
      "pay_1"
    );

    expect(result.newlyPaid).toBe(false);
    expect(purchaseEmailService.notifyOrderFulfilled).not.toHaveBeenCalled();
    expect(orderRepository.setDownloadToken).not.toHaveBeenCalled();
  });
});

describe("orderFulfillmentService offer checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userRepository.findById).mockResolvedValue({
      _id: "buyer_1",
      email: "buyer@example.com",
      name: "Ada",
    } as never);
    vi.mocked(cartRepository.clear).mockResolvedValue(undefined as never);
    vi.mocked(beatRepository.incrementSalesCount).mockResolvedValue(undefined as never);
    vi.mocked(userRepository.incrementSalesCount).mockResolvedValue(undefined as never);
    vi.mocked(offerService.attachAcceptedPurchase).mockResolvedValue(undefined as never);
    vi.mocked(licenseRepository.deactivateAllForBeat).mockResolvedValue(undefined as never);
    vi.mocked(beatRepository.markExclusive).mockResolvedValue({} as never);
  });

  const snapshot = {
    name: "Custom Unlimited",
    includesWav: true,
    includesStems: true,
    commercialUse: true,
    streamLimit: -1,
    terms: "Negotiated terms",
  };

  function offerOrder(overrides: Record<string, unknown> = {}) {
    return pendingBeatOrder({
      offerId: "offer_1",
      totalAmount: 8000,
      items: [
        {
          beatId: "beat_1",
          licenseType: "unlimited",
          price: 8000,
          beatTitle: "Midnight",
        },
      ],
      ...overrides,
    });
  }

  it("fulfills from the license snapshot and skips the live License row", async () => {
    const paid = { ...offerOrder(), status: "paid" };
    vi.mocked(orderRepository.markPaidIfPending).mockResolvedValueOnce(paid as never);
    vi.mocked(offerService.acceptForOrder).mockResolvedValueOnce({
      licenseType: "unlimited",
      snapshot,
    } as never);
    vi.mocked(beatRepository.findById).mockResolvedValueOnce({
      _id: "beat_1",
      isPublished: true,
      status: "published",
      producerId: "prod_1",
    } as never);
    vi.mocked(purchaseRepository.create).mockResolvedValueOnce({ _id: "p1" } as never);

    const result = await orderFulfillmentService.fulfillOrder(offerOrder() as never, "pay_1");

    expect(result.newlyPaid).toBe(true);
    expect(licenseRepository.findById).not.toHaveBeenCalled();
    expect(purchaseRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 8000,
        includesWav: true,
        includesStems: true,
        licenseSnapshot: snapshot,
        offerId: "offer_1",
        producerId: "prod_1",
      }),
      expect.anything()
    );
  });

  it("returns 409 when a second checkout loses acceptIfOpen", async () => {
    const paid = { ...offerOrder(), status: "paid" };
    vi.mocked(orderRepository.markPaidIfPending).mockResolvedValueOnce(paid as never);
    vi.mocked(offerService.acceptForOrder).mockRejectedValueOnce({ statusCode: 409 });

    await expect(
      orderFulfillmentService.fulfillOrder(offerOrder() as never, "pay_1")
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it("unlists the beat on guest exclusive offer payment", async () => {
    const guestOrder = offerOrder({
      buyerId: undefined,
      guestEmail: "guest@example.com",
      items: [
        {
          beatId: "beat_1",
          licenseType: "exclusive",
          price: 25000,
          beatTitle: "Midnight",
        },
      ],
    });
    vi.mocked(orderRepository.markPaidIfPending).mockResolvedValueOnce({
      ...guestOrder,
      status: "paid",
    } as never);
    vi.mocked(offerService.acceptForOrder).mockResolvedValueOnce({
      licenseType: "exclusive",
      snapshot: { ...snapshot, name: "Exclusive Rights" },
    } as never);
    vi.mocked(beatRepository.findById).mockResolvedValueOnce({
      _id: "beat_1",
      isPublished: true,
      status: "published",
      producerId: "prod_1",
    } as never);
    vi.mocked(purchaseRepository.create).mockResolvedValueOnce({ _id: "p1" } as never);
    vi.mocked(orderRepository.setDownloadToken).mockResolvedValueOnce({} as never);

    const result = await orderFulfillmentService.fulfillGuestOrder(guestOrder as never, "pay_1");

    expect(result.newlyPaid).toBe(true);
    expect(beatRepository.markExclusive).toHaveBeenCalledWith(
      "beat_1",
      expect.objectContaining({
        status: "archived",
        isPublished: false,
      }),
      expect.anything()
    );
    expect(vi.mocked(beatRepository.markExclusive).mock.calls[0][1]).not.toHaveProperty(
      "exclusiveBuyerId"
    );
    expect(licenseRepository.deactivateAllForBeat).toHaveBeenCalledWith(
      "beat_1",
      expect.anything()
    );
  });
});

describe("orderFulfillmentService service checkout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fulfills a service deposit without creating a Purchase", async () => {
    const { serviceJobService } = await import("@/lib/services/service-job.service");
    const paid = pendingBeatOrder({
      items: [
        {
          kind: "service_deposit",
          serviceJobId: "job_1",
          serviceTitle: "Custom trap beat",
          price: 2500,
        },
      ],
      totalAmount: 2500,
      status: "paid",
    });
    vi.mocked(orderRepository.markPaidIfPending).mockResolvedValueOnce(paid as never);

    const result = await orderFulfillmentService.fulfillOrder(paid as never, "pay_1");

    expect(result.newlyPaid).toBe(true);
    expect(result.purchases).toEqual([]);
    expect(purchaseRepository.create).not.toHaveBeenCalled();
    expect(serviceJobService.onPaymentCaptured).toHaveBeenCalled();
    expect(purchaseEmailService.notifyOrderFulfilled).not.toHaveBeenCalled();
  });

  it("does not throw when a service order was already paid", async () => {
    vi.mocked(orderRepository.markPaidIfPending).mockResolvedValueOnce(null);
    vi.mocked(orderRepository.findById).mockResolvedValueOnce({
      _id: "order_1",
      status: "paid",
      items: [
        {
          kind: "service_deposit",
          serviceJobId: "job_1",
          serviceTitle: "Custom trap beat",
          price: 2500,
        },
      ],
    } as never);

    const result = await orderFulfillmentService.fulfillOrder(
      pendingBeatOrder({
        items: [
          {
            kind: "service_deposit",
            serviceJobId: "job_1",
            price: 2500,
          },
        ],
      }) as never,
      "pay_1"
    );

    expect(result.newlyPaid).toBe(false);
    expect(result.purchases).toEqual([]);
    expect(purchaseRepository.create).not.toHaveBeenCalled();
  });
});

