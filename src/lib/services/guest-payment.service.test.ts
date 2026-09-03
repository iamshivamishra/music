import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/repositories/order.repository", () => ({
  orderRepository: {
    create: vi.fn(),
    attachRazorpayOrderId: vi.fn(),
    findByRazorpayOrderId: vi.fn(),
    findPendingByGuestEmailAndBeat: vi.fn(),
    findByDownloadTokenAny: vi.fn(),
    updateStatus: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/purchase.repository", () => ({
  purchaseRepository: {
    hasPurchased: vi.fn(),
    findPaidByGuestEmailAndBeat: vi.fn(),
    findByOrderId: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/license.repository", () => ({
  licenseRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/beat.repository", () => ({
  beatRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/razorpay", () => ({
  razorpay: {
    orders: {
      create: vi.fn(),
    },
  },
  verifySignature: vi.fn(),
  fetchPaymentById: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock("@/lib/audit", () => ({
  audit: vi.fn(),
}));

vi.mock("@/lib/services/beat-event.service", () => ({
  beatEventService: {
    record: vi.fn(),
    recordCheckoutStarts: vi.fn(),
  },
}));

vi.mock("@/lib/services/order-fulfillment", () => ({
  orderFulfillmentService: {
    fulfillGuestOrder: vi.fn(),
  },
}));

vi.mock("@/lib/services/download.service", () => ({
  downloadService: {
    getGuestDownloadLinks: vi.fn(),
  },
}));

import { orderRepository } from "@/lib/repositories/order.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { razorpay } from "@/lib/razorpay";
import { beatEventService } from "@/lib/services/beat-event.service";
import { orderFulfillmentService } from "@/lib/services/order-fulfillment";
import { downloadService } from "@/lib/services/download.service";
import { guestPaymentService } from "./guest-payment.service";
import { ConflictError } from "@/lib/errors";

const guestInput = {
  beatId: "beat_1",
  licenseId: "license_1",
  guestEmail: "Buyer@Example.com",
  guestName: "Buyer",
};

function pendingOrder() {
  return {
    _id: "order_pending",
    guestEmail: "buyer@example.com",
    status: "pending",
    totalAmount: 499,
    razorpayOrderId: "rzp_pending",
    downloadToken: undefined,
  };
}

function paidOrder(overrides: Record<string, unknown> = {}) {
  return {
    _id: "order_paid",
    guestEmail: "buyer@example.com",
    status: "paid",
    totalAmount: 499,
    razorpayOrderId: "rzp_paid",
    razorpayPaymentId: "pay_1",
    downloadToken: "tok_abc",
    downloadTokenExpiry: new Date(Date.now() + 60 * 60 * 1000),
    receipt: "rcpt_1",
    paidAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("guestPaymentService.createGuestOrder attribution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("copies cookie attribution onto the order", async () => {
    vi.mocked(purchaseRepository.findPaidByGuestEmailAndBeat).mockResolvedValueOnce(null);
    vi.mocked(orderRepository.findPendingByGuestEmailAndBeat).mockResolvedValueOnce(null);
    vi.mocked(licenseRepository.findById).mockResolvedValueOnce({
      _id: "license_1",
      beatId: "beat_1",
      isActive: true,
      type: "basic",
      price: 499,
    } as never);
    vi.mocked(beatRepository.findById).mockResolvedValueOnce({
      _id: "beat_1",
      title: "Fire",
      isPublished: true,
      status: "published",
      producerId: "prod_1",
    } as never);
    vi.mocked(orderRepository.create).mockResolvedValueOnce({
      _id: "order_guest",
      items: [{ beatId: "beat_1", price: 499 }],
      totalAmount: 499,
      receipt: "g1",
    } as never);
    vi.mocked(razorpay.orders.create).mockResolvedValueOnce({ id: "rzp_g" } as never);

    await guestPaymentService.createGuestOrder(
      { beatId: "beat_1", licenseId: "license_1", guestEmail: "a@b.com" },
      { source: "direct" }
    );

    expect(orderRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        attribution: { source: "direct" },
        guestEmail: "a@b.com",
      })
    );
    expect(beatEventService.recordCheckoutStarts).toHaveBeenCalled();
  });
});

describe("guestPaymentService.createGuestOrder unlisted drops", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(purchaseRepository.findPaidByGuestEmailAndBeat).mockResolvedValue(null);
    vi.mocked(orderRepository.findPendingByGuestEmailAndBeat).mockResolvedValue(null);
    vi.mocked(licenseRepository.findById).mockResolvedValue({
      _id: "license_1",
      beatId: "beat_1",
      isActive: true,
      type: "basic",
      price: 499,
    } as never);
  });

  it("rejects unlisted beats without an access token", async () => {
    vi.mocked(beatRepository.findById).mockResolvedValueOnce({
      _id: "beat_1",
      title: "Secret",
      isPublished: false,
      status: "unlisted",
      privateToken: "secret-token",
      producerId: "prod_1",
    } as never);

    await expect(
      guestPaymentService.createGuestOrder({
        beatId: "beat_1",
        licenseId: "license_1",
        guestEmail: "a@b.com",
      })
    ).rejects.toBeInstanceOf(ConflictError);
    expect(orderRepository.create).not.toHaveBeenCalled();
  });

  it("creates an order when the private token matches", async () => {
    vi.mocked(beatRepository.findById).mockResolvedValueOnce({
      _id: "beat_1",
      title: "Secret",
      isPublished: false,
      status: "unlisted",
      privateToken: "secret-token",
      producerId: "prod_1",
    } as never);
    vi.mocked(orderRepository.create).mockResolvedValueOnce({
      _id: "order_guest",
      items: [{ beatId: "beat_1", price: 499 }],
      totalAmount: 499,
      receipt: "g1",
    } as never);
    vi.mocked(razorpay.orders.create).mockResolvedValueOnce({ id: "rzp_g" } as never);

    await guestPaymentService.createGuestOrder({
      beatId: "beat_1",
      licenseId: "license_1",
      guestEmail: "a@b.com",
      accessToken: "secret-token",
    });

    expect(orderRepository.create).toHaveBeenCalled();
  });
});

describe("guestPaymentService.createGuestOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when the guest already purchased the beat", async () => {
    vi.mocked(purchaseRepository.findPaidByGuestEmailAndBeat).mockResolvedValueOnce({
      _id: "purchase_1",
    } as never);

    await expect(guestPaymentService.createGuestOrder(guestInput)).rejects.toBeInstanceOf(
      ConflictError
    );
    expect(orderRepository.create).not.toHaveBeenCalled();
  });

  it("reuses a pending guest order for the same email and beat", async () => {
    vi.mocked(purchaseRepository.findPaidByGuestEmailAndBeat).mockResolvedValueOnce(null);
    vi.mocked(orderRepository.findPendingByGuestEmailAndBeat).mockResolvedValueOnce(
      pendingOrder() as never
    );

    const result = await guestPaymentService.createGuestOrder(guestInput);

    expect(result).toEqual({
      orderId: "rzp_pending",
      amount: 499,
      currency: "INR",
      internalOrderId: "order_pending",
    });
    expect(orderRepository.findPendingByGuestEmailAndBeat).toHaveBeenCalledWith(
      "buyer@example.com",
      "beat_1"
    );
    expect(orderRepository.create).not.toHaveBeenCalled();
  });

  it("creates a Razorpay order for a new guest purchase", async () => {
    vi.mocked(purchaseRepository.findPaidByGuestEmailAndBeat).mockResolvedValueOnce(null);
    vi.mocked(orderRepository.findPendingByGuestEmailAndBeat).mockResolvedValueOnce(null);
    vi.mocked(licenseRepository.findById).mockResolvedValueOnce({
      _id: "license_1",
      beatId: "beat_1",
      type: "basic",
      price: 499,
      isActive: true,
    } as never);
    vi.mocked(beatRepository.findById).mockResolvedValueOnce({
      _id: "beat_1",
      title: "Night Drive",
      isPublished: true,
      status: "published",
    } as never);
    vi.mocked(orderRepository.create).mockResolvedValueOnce({
      _id: "order_new",
      totalAmount: 499,
      receipt: "rcpt_test",
      items: [{ beatId: "beat_1" }],
    } as never);
    vi.mocked(razorpay.orders.create).mockResolvedValueOnce({
      id: "rzp_new",
    } as never);

    const result = await guestPaymentService.createGuestOrder(guestInput);

    expect(result.orderId).toBe("rzp_new");
    expect(orderRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({ guestEmail: "buyer@example.com" })
    );
  });
});

describe("guestPaymentService.verifyGuestPayment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects when the email does not own the order", async () => {
    vi.mocked(orderRepository.findByRazorpayOrderId).mockResolvedValueOnce({
      ...pendingOrder(),
      guestEmail: "other@example.com",
    } as never);

    await expect(
      guestPaymentService.verifyGuestPayment(
        { orderId: "rzp_pending", paymentId: "pay_1", signature: "sig" },
        "buyer@example.com"
      )
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("returns the existing download token when the order is already paid", async () => {
    vi.mocked(orderRepository.findByRazorpayOrderId).mockResolvedValueOnce(
      paidOrder() as never
    );
    vi.mocked(purchaseRepository.findByOrderId).mockResolvedValueOnce([
      { _id: "p1" },
    ] as never);

    const result = await guestPaymentService.verifyGuestPayment(
      { orderId: "rzp_paid", paymentId: "pay_1", signature: "sig" },
      "buyer@example.com"
    );

    expect(result.downloadToken).toBe("tok_abc");
    expect(orderFulfillmentService.fulfillGuestOrder).not.toHaveBeenCalled();
  });
});

describe("guestPaymentService.markFailed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks a pending order failed when the email matches", async () => {
    vi.mocked(orderRepository.findByRazorpayOrderId).mockResolvedValueOnce(
      pendingOrder() as never
    );

    await guestPaymentService.markFailed(
      "rzp_pending",
      "Buyer@Example.com",
      "Payment cancelled by user"
    );

    expect(orderRepository.updateStatus).toHaveBeenCalledWith("order_pending", "failed", {
      failureReason: "Payment cancelled by user",
    });
  });

  it("does not fail an order for a mismatched email", async () => {
    vi.mocked(orderRepository.findByRazorpayOrderId).mockResolvedValueOnce(
      pendingOrder() as never
    );

    await guestPaymentService.markFailed("rzp_pending", "other@example.com", "cancel");

    expect(orderRepository.updateStatus).not.toHaveBeenCalled();
  });

  it("does not fail an already paid order", async () => {
    vi.mocked(orderRepository.findByRazorpayOrderId).mockResolvedValueOnce(
      paidOrder() as never
    );

    await guestPaymentService.markFailed("rzp_paid", "buyer@example.com", "cancel");

    expect(orderRepository.updateStatus).not.toHaveBeenCalled();
  });
});

describe("guestPaymentService.getDownloadTokenState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns valid for a paid unexpired token", async () => {
    vi.mocked(orderRepository.findByDownloadTokenAny).mockResolvedValueOnce(
      paidOrder() as never
    );

    await expect(guestPaymentService.getDownloadTokenState("tok_abc")).resolves.toEqual({
      status: "valid",
      order: expect.objectContaining({ _id: "order_paid" }),
    });
  });

  it("returns expired when the token is past expiry", async () => {
    vi.mocked(orderRepository.findByDownloadTokenAny).mockResolvedValueOnce(
      paidOrder({ downloadTokenExpiry: new Date(Date.now() - 1000) }) as never
    );

    const result = await guestPaymentService.getDownloadTokenState("tok_abc");
    expect(result.status).toBe("expired");
  });

  it("returns invalid when no order matches the token", async () => {
    vi.mocked(orderRepository.findByDownloadTokenAny).mockResolvedValueOnce(null);

    await expect(guestPaymentService.getDownloadTokenState("missing")).resolves.toEqual({
      status: "invalid",
    });
  });
});

describe("guestPaymentService.getGuestDownload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns invalid without fetching links", async () => {
    vi.mocked(orderRepository.findByDownloadTokenAny).mockResolvedValueOnce(null);

    await expect(guestPaymentService.getGuestDownload("missing")).resolves.toEqual({
      status: "invalid",
    });
    expect(downloadService.getGuestDownloadLinks).not.toHaveBeenCalled();
  });

  it("returns expired with the guest email", async () => {
    vi.mocked(orderRepository.findByDownloadTokenAny).mockResolvedValueOnce(
      paidOrder({ downloadTokenExpiry: new Date(Date.now() - 1000) }) as never
    );

    await expect(guestPaymentService.getGuestDownload("tok_abc")).resolves.toEqual({
      status: "expired",
      guestEmail: "buyer@example.com",
    });
    expect(downloadService.getGuestDownloadLinks).not.toHaveBeenCalled();
  });

  it("returns a download DTO for a valid token", async () => {
    vi.mocked(orderRepository.findByDownloadTokenAny).mockResolvedValueOnce(
      paidOrder() as never
    );
    vi.mocked(downloadService.getGuestDownloadLinks).mockResolvedValueOnce([
      {
        beatId: "beat_1",
        beatTitle: "Night Drive",
        coverUrl: null,
        licenseType: "basic",
        amount: 499,
        links: [],
      },
    ]);

    const result = await guestPaymentService.getGuestDownload("tok_abc");

    expect(result.status).toBe("valid");
    if (result.status !== "valid") return;
    expect(result.download.guestEmail).toBe("buyer@example.com");
    expect(result.download.items).toHaveLength(1);
    expect(downloadService.getGuestDownloadLinks).toHaveBeenCalledWith("rzp_paid");
  });
});
