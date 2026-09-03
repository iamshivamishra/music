import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/repositories/order.repository", () => ({
  orderRepository: {
    create: vi.fn(),
    attachRazorpayOrderId: vi.fn(),
    findByRazorpayOrderId: vi.fn(),
    findPendingByBuyerAndBeat: vi.fn(),
    findPendingByBuyerAndBeatIds: vi.fn(),
    markPaidIfPending: vi.fn(),
    updateStatus: vi.fn(),
    findById: vi.fn(),
    findByBuyer: vi.fn(),
    setDownloadToken: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/purchase.repository", () => ({
  purchaseRepository: {
    hasPurchased: vi.fn(),
    hasPackPurchase: vi.fn(),
    create: vi.fn(),
    findByBuyerAndBeat: vi.fn(),
    findByBuyerAndOrderId: vi.fn(),
    findPackPurchase: vi.fn(),
    getPurchasedBeatIds: vi.fn(),
    findByBuyerId: vi.fn(),
    getEarningsByProducer: vi.fn(),
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
    incrementSalesCount: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/pack.repository", () => ({
  packRepository: {
    findById: vi.fn(),
    incrementSalesCount: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: {
    findById: vi.fn(),
    incrementSalesCount: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/cart.repository", () => ({
  cartRepository: {
    clear: vi.fn(),
  },
}));

vi.mock("@/lib/services/cart.service", () => ({
  cartService: {
    getItems: vi.fn(),
    getPackItems: vi.fn(),
  },
}));

vi.mock("@/lib/services/coupon.service", () => ({
  couponService: {
    validateCoupon: vi.fn(),
    recordUsage: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({
  withTransaction: vi.fn(async (operation: (session: unknown) => Promise<unknown>) =>
    operation({})),
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
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
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

vi.mock("@/lib/services/pdf.service", () => ({
  pdfService: {
    persistLicenseIdentifiers: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@/lib/services/purchase-email.service", () => ({
  purchaseEmailService: {
    notifyOrderFulfilled: vi.fn().mockResolvedValue(undefined),
  },
}));

import { ConflictError, ValidationError } from "@/lib/errors";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { orderRepository } from "@/lib/repositories/order.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { cartRepository } from "@/lib/repositories/cart.repository";
import { fetchPaymentById, razorpay, verifySignature } from "@/lib/razorpay";
import { beatEventService } from "@/lib/services/beat-event.service";
import { paymentService } from "./payment.service";

function beatOrder(status: "pending" | "failed" | "paid") {
  return {
    _id: "order_wh",
    buyerId: "buyer_1",
    status,
    totalAmount: 999,
    razorpayOrderId: "rzp_wh",
    items: [
      {
        beatId: "beat_1",
        licenseId: "license_1",
        licenseType: "basic",
        price: 999,
        beatTitle: "Track",
      },
    ],
  };
}

function capturedPayment() {
  return {
    id: "pay_wh",
    order_id: "rzp_wh",
    status: "captured" as const,
    amount: 99900,
    currency: "INR",
  };
}

async function mockSuccessfulBeatFulfill() {
  vi.mocked(orderRepository.markPaidIfPending).mockResolvedValue(beatOrder("paid") as never);
  vi.mocked(beatRepository.findById).mockResolvedValue({
    _id: "beat_1",
    isPublished: true,
    status: "published",
    producerId: "prod_1",
  } as never);
  vi.mocked(licenseRepository.findById).mockResolvedValue({
    _id: "license_1",
    isActive: true,
    beatId: "beat_1",
    includesWav: true,
    includesStems: false,
  } as never);
  vi.mocked(purchaseRepository.create).mockResolvedValue({ _id: "p1" } as never);
  vi.mocked(userRepository.incrementSalesCount).mockResolvedValue(undefined as never);
  vi.mocked(cartRepository.clear).mockResolvedValue(undefined as never);
}

describe("paymentService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("reuses an existing pending single-beat order instead of creating duplicate", async () => {
    vi.mocked(purchaseRepository.hasPurchased).mockResolvedValueOnce(false);
    vi.mocked(orderRepository.findPendingByBuyerAndBeat).mockResolvedValueOnce({
      _id: "order_existing",
      razorpayOrderId: "razorpay_existing",
      totalAmount: 499,
    } as never);

    const result = await paymentService.createOrder(
      { beatId: "beat_1", licenseId: "license_1" },
      "buyer_1"
    );

    expect(result).toEqual({
      orderId: "razorpay_existing",
      amount: 499,
      currency: "INR",
      internalOrderId: "order_existing",
    });
    expect(razorpay.orders.create).not.toHaveBeenCalled();
    expect(orderRepository.create).not.toHaveBeenCalled();
  });

  it("copies attribution onto a new order and records checkout_start", async () => {
    vi.mocked(purchaseRepository.hasPurchased).mockResolvedValueOnce(false);
    vi.mocked(orderRepository.findPendingByBuyerAndBeat).mockResolvedValueOnce(null);
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
      _id: "order_new",
      items: [{ beatId: "beat_1", price: 499 }],
      totalAmount: 499,
      receipt: "r1",
    } as never);
    vi.mocked(razorpay.orders.create).mockResolvedValueOnce({ id: "rzp_new" } as never);

    await paymentService.createOrder(
      { beatId: "beat_1", licenseId: "license_1" },
      "buyer_1",
      { source: "whatsapp", beatId: "beat_1" }
    );

    expect(orderRepository.create).toHaveBeenCalledWith(
      expect.objectContaining({
        attribution: { source: "whatsapp", beatId: "beat_1" },
      })
    );
    expect(beatEventService.recordCheckoutStarts).toHaveBeenCalled();
  });

  it("uses direct when attribution is omitted", async () => {
    vi.mocked(purchaseRepository.hasPurchased).mockResolvedValueOnce(false);
    vi.mocked(orderRepository.findPendingByBuyerAndBeat).mockResolvedValueOnce(null);
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
      _id: "order_new",
      items: [{ beatId: "beat_1", price: 499 }],
      totalAmount: 499,
      receipt: "r1",
    } as never);
    vi.mocked(razorpay.orders.create).mockResolvedValueOnce({ id: "rzp_new" } as never);

    await paymentService.createOrder(
      { beatId: "beat_1", licenseId: "license_1" },
      "buyer_1"
    );

    const payload = vi.mocked(orderRepository.create).mock.calls[0][0];
    expect(payload.attribution).toBeUndefined();
  });

  it("returns idempotent success for already-paid order", async () => {
    vi.mocked(orderRepository.findByRazorpayOrderId).mockResolvedValueOnce({
      _id: "order_1",
      buyerId: "buyer_1",
      status: "paid",
      razorpayPaymentId: "pay_1",
    } as never);
    vi.mocked(purchaseRepository.findByBuyerAndOrderId).mockResolvedValueOnce(
      [{ _id: "purchase_1" }] as never
    );

    const result = await paymentService.verifyAndRecord(
      {
        orderId: "rzp_order_1",
        paymentId: "pay_1",
        signature: "sig_1",
      },
      "buyer_1"
    );

    expect(result.order.status).toBe("paid");
    expect(result.purchases).toHaveLength(1);
    expect(orderRepository.markPaidIfPending).not.toHaveBeenCalled();
  });

  it("rejects when provider payment details do not match order", async () => {
    vi.mocked(orderRepository.findByRazorpayOrderId).mockResolvedValueOnce({
      _id: "order_2",
      buyerId: "buyer_1",
      status: "pending",
      totalAmount: 999,
    } as never);
    vi.mocked(verifySignature).mockReturnValueOnce(true);
    vi.mocked(fetchPaymentById).mockResolvedValueOnce({
      id: "pay_2",
      order_id: "rzp_order_2",
      status: "authorized",
      amount: 99900,
      currency: "INR",
    });

    await expect(
      paymentService.verifyAndRecord(
        {
          orderId: "rzp_order_1",
          paymentId: "pay_2",
          signature: "sig_2",
        },
        "buyer_1"
      )
    ).rejects.toBeInstanceOf(ValidationError);

    expect(orderRepository.updateStatus).toHaveBeenCalledWith(
      "order_2",
      "failed",
      expect.objectContaining({
        razorpayPaymentId: "pay_2",
      })
    );
  });

  it("throws conflict when order belongs to another user", async () => {
    vi.mocked(orderRepository.findByRazorpayOrderId).mockResolvedValueOnce({
      _id: "order_3",
      buyerId: "buyer_2",
      status: "pending",
    } as never);

    await expect(
      paymentService.verifyAndRecord(
        {
          orderId: "rzp_order_3",
          paymentId: "pay_3",
          signature: "sig_3",
        },
        "buyer_1"
      )
    ).rejects.toBeInstanceOf(ConflictError);

    expect(verifySignature).not.toHaveBeenCalled();
    expect(beatRepository.incrementSalesCount).not.toHaveBeenCalled();
    expect(licenseRepository.findById).not.toHaveBeenCalled();
  });

  describe("handleWebhookEvent", () => {
    it("fulfills captured payments", async () => {
      vi.mocked(orderRepository.findByRazorpayOrderId).mockResolvedValueOnce(
        beatOrder("pending") as never
      );
      vi.mocked(fetchPaymentById).mockResolvedValueOnce(capturedPayment());
      await mockSuccessfulBeatFulfill();

      await paymentService.handleWebhookEvent({
        event: "payment.captured",
        payload: { payment: { entity: { id: "pay_wh", order_id: "rzp_wh" } } },
      });

      expect(orderRepository.markPaidIfPending).toHaveBeenCalled();
    });

    it("marks pending orders failed on payment.failed", async () => {
      vi.mocked(orderRepository.findByRazorpayOrderId).mockResolvedValueOnce(
        beatOrder("pending") as never
      );

      await paymentService.handleWebhookEvent({
        event: "payment.failed",
        payload: { payment: { entity: { id: "pay_wh", order_id: "rzp_wh" } } },
      });

      expect(orderRepository.updateStatus).toHaveBeenCalledWith(
        "order_wh",
        "failed",
        expect.objectContaining({ razorpayPaymentId: "pay_wh" })
      );
    });
  });

  describe("fulfillFromWebhook", () => {
    it("is a no-op when the order is already paid", async () => {
      vi.mocked(orderRepository.findByRazorpayOrderId).mockResolvedValueOnce(
        beatOrder("paid") as never
      );

      await paymentService.fulfillFromWebhook("rzp_wh", "pay_wh");

      expect(fetchPaymentById).not.toHaveBeenCalled();
      expect(orderRepository.markPaidIfPending).not.toHaveBeenCalled();
    });

    it("fulfills a pending order when the provider payment is captured", async () => {
      vi.mocked(orderRepository.findByRazorpayOrderId).mockResolvedValueOnce(
        beatOrder("pending") as never
      );
      vi.mocked(fetchPaymentById).mockResolvedValueOnce(capturedPayment());
      await mockSuccessfulBeatFulfill();

      await paymentService.fulfillFromWebhook("rzp_wh", "pay_wh");

      expect(orderRepository.markPaidIfPending).toHaveBeenCalled();
      expect(purchaseRepository.create).toHaveBeenCalled();
      expect(cartRepository.clear).toHaveBeenCalledWith("buyer_1", expect.anything());
    });

    it("fulfills a failed order when capture wins over modal dismiss", async () => {
      vi.mocked(orderRepository.findByRazorpayOrderId).mockResolvedValueOnce(
        beatOrder("failed") as never
      );
      vi.mocked(fetchPaymentById).mockResolvedValueOnce(capturedPayment());
      await mockSuccessfulBeatFulfill();

      await paymentService.fulfillFromWebhook("rzp_wh", "pay_wh");

      expect(orderRepository.markPaidIfPending).toHaveBeenCalled();
      expect(purchaseRepository.create).toHaveBeenCalled();
    });

    it("does not fulfill when the captured amount does not match", async () => {
      vi.mocked(orderRepository.findByRazorpayOrderId).mockResolvedValueOnce(
        beatOrder("pending") as never
      );
      vi.mocked(fetchPaymentById).mockResolvedValueOnce({
        ...capturedPayment(),
        amount: 100,
      });

      await paymentService.fulfillFromWebhook("rzp_wh", "pay_wh");

      expect(orderRepository.markPaidIfPending).not.toHaveBeenCalled();
    });
  });
});
