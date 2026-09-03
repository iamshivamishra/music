import { beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/rate-limit", () => ({
  getClientIp: vi.fn(() => "1.1.1.1"),
  rateLimit: vi.fn(async () => ({ success: true, remaining: 4, resetAt: Date.now() + 1000 })),
  rateLimitResponse: vi.fn(() => Response.json({ error: "rate limited" }, { status: 429 })),
}));

vi.mock("@/lib/services/guest-payment.service", () => ({
  guestPaymentService: {
    createGuestOrder: vi.fn(),
  },
}));

vi.mock("@/lib/attribution", () => ({
  attributionFromCookies: vi.fn(() => undefined),
}));

vi.mock("@/lib/unlisted-token", () => ({
  resolveUnlistedAccessToken: vi.fn(
    async (options: { bodyToken?: string | null }) => options.bodyToken || undefined
  ),
}));

import { rateLimit } from "@/lib/rate-limit";
import { guestPaymentService } from "@/lib/services/guest-payment.service";
import { POST } from "./route";

function guestOrderRequest(body: object) {
  return new Request("http://localhost/api/payment/guest/create-order", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

const validBody = {
  beatId: "beat_1",
  licenseId: "license_1",
  guestEmail: "Buyer@Example.com",
};

describe("POST /api/payment/guest/create-order", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(rateLimit).mockResolvedValue({
      success: true,
      remaining: 4,
      resetAt: Date.now() + 1000,
    });
  });

  it("returns 429 when the IP rate limit is exceeded", async () => {
    vi.mocked(rateLimit).mockResolvedValueOnce({
      success: false,
      remaining: 0,
      resetAt: Date.now() + 1000,
    });

    const response = await POST(guestOrderRequest(validBody));

    expect(response.status).toBe(429);
    expect(guestPaymentService.createGuestOrder).not.toHaveBeenCalled();
  });

  it("returns 429 when the email rate limit is exceeded", async () => {
    vi.mocked(rateLimit)
      .mockResolvedValueOnce({
        success: true,
        remaining: 4,
        resetAt: Date.now() + 1000,
      })
      .mockResolvedValueOnce({
        success: false,
        remaining: 0,
        resetAt: Date.now() + 1000,
      });

    const response = await POST(guestOrderRequest(validBody));

    expect(response.status).toBe(429);
    expect(rateLimit).toHaveBeenNthCalledWith(
      2,
      "buyer@example.com",
      expect.objectContaining({ limit: 3, windowSec: 86400, prefix: "guest-order-email" })
    );
    expect(guestPaymentService.createGuestOrder).not.toHaveBeenCalled();
  });

  it("creates a guest order when both rate limits pass", async () => {
    vi.mocked(guestPaymentService.createGuestOrder).mockResolvedValueOnce({
      orderId: "rzp_1",
      amount: 499,
      currency: "INR",
      internalOrderId: "order_1",
    });

    const response = await POST(guestOrderRequest(validBody));
    const json = await response.json();

    expect(response.status).toBe(200);
    expect(json.orderId).toBe("rzp_1");
    expect(guestPaymentService.createGuestOrder).toHaveBeenCalled();
  });
});
