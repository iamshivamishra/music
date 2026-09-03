import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/rate-limit", () => ({
  getClientIp: vi.fn(() => "1.1.1.1"),
  rateLimit: vi.fn(async () => ({ success: true, remaining: 59, resetAt: Date.now() + 1000 })),
  rateLimitResponse: vi.fn(() => Response.json({ error: "rate limited" }, { status: 429 })),
}));

vi.mock("@/lib/razorpay", () => ({
  verifyWebhookSignature: vi.fn(),
}));

vi.mock("@/lib/services/payment.service", () => ({
  paymentService: {
    handleWebhookEvent: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { verifyWebhookSignature } from "@/lib/razorpay";
import { paymentService } from "@/lib/services/payment.service";
import { POST } from "./route";

function webhookRequest(body: object, signature = "sig") {
  return new Request("http://localhost/api/payment/webhook", {
    method: "POST",
    headers: { "x-razorpay-signature": signature, "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("POST /api/payment/webhook", () => {
  const originalSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.RAZORPAY_WEBHOOK_SECRET = "whsec";
  });

  afterEach(() => {
    process.env.RAZORPAY_WEBHOOK_SECRET = originalSecret;
  });

  it("returns 400 for an invalid signature", async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValueOnce(false);
    const response = await POST(webhookRequest({ event: "payment.captured" }));
    expect(response.status).toBe(400);
    expect(paymentService.handleWebhookEvent).not.toHaveBeenCalled();
  });

  it("dispatches captured payments to the payment service", async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValueOnce(true);
    vi.mocked(paymentService.handleWebhookEvent).mockResolvedValueOnce(undefined);

    const payload = {
      event: "payment.captured",
      payload: { payment: { entity: { id: "pay_1", order_id: "order_1" } } },
    };
    const response = await POST(webhookRequest(payload));

    expect(response.status).toBe(200);
    expect(paymentService.handleWebhookEvent).toHaveBeenCalledWith(payload);
  });

  it("dispatches failed payments to the payment service", async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValueOnce(true);
    vi.mocked(paymentService.handleWebhookEvent).mockResolvedValueOnce(undefined);

    const payload = {
      event: "payment.failed",
      payload: { payment: { entity: { id: "pay_2", order_id: "order_2" } } },
    };
    const response = await POST(webhookRequest(payload));

    expect(response.status).toBe(200);
    expect(paymentService.handleWebhookEvent).toHaveBeenCalledWith(payload);
  });

  it("returns 500 when fulfillment throws so Razorpay can retry", async () => {
    vi.mocked(verifyWebhookSignature).mockReturnValueOnce(true);
    vi.mocked(paymentService.handleWebhookEvent).mockRejectedValueOnce(new Error("db down"));

    const response = await POST(
      webhookRequest({
        event: "payment.captured",
        payload: { payment: { entity: { id: "pay_1", order_id: "order_1" } } },
      })
    );

    expect(response.status).toBe(500);
  });
});
