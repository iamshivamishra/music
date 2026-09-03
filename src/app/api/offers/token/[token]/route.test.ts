import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/services/offer.service", () => ({
  offerService: {
    getPublicByToken: vi.fn(),
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn().mockResolvedValue({ success: true, remaining: 10, resetAt: Date.now() + 1000 }),
  getClientIp: vi.fn().mockReturnValue("1.1.1.1"),
  rateLimitResponse: vi.fn(),
}));

import { offerService } from "@/lib/services/offer.service";
import { GET } from "./route";

describe("GET /api/offers/token/[token]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(offerService.getPublicByToken).mockResolvedValue({
      token: "tok_1",
      status: "open",
      amount: 8000,
      expiresAt: new Date().toISOString(),
      licenseType: "unlimited",
      licenseSnapshot: {
        name: "Unlimited License",
        includesWav: true,
        includesStems: true,
        commercialUse: true,
        streamLimit: -1,
        terms: "Terms",
      },
      beat: { id: "beat_1", title: "Midnight", genre: "Hip Hop" },
      producerName: "Prod",
    });
  });

  it("returns the public summary without requester PII", async () => {
    const request = new NextRequest("http://localhost/api/offers/token/tok_1");
    const response = await GET(request, { params: Promise.resolve({ token: "tok_1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.amount).toBe(8000);
    expect(body.beat.title).toBe("Midnight");
    expect(body).not.toHaveProperty("requesterEmail");
    expect(body).not.toHaveProperty("requesterNote");
  });
});
