import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { NextRequest } from "next/server";
import { NotFoundError } from "@/lib/errors";

vi.mock("@/lib/logger", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/services/lead.service", () => ({
  leadService: {
    captureAndGrant: vi.fn(),
  },
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientIp: vi.fn(() => "127.0.0.1"),
  rateLimit: vi.fn(),
  rateLimitResponse: vi.fn((resetAt: number) =>
    Response.json(
      { error: "Too many requests. Please try again later.", code: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": "1", "X-RateLimit-Reset": new Date(resetAt).toISOString() } }
    )
  ),
}));

import { auth } from "@/lib/auth";
import { leadService } from "@/lib/services/lead.service";
import { rateLimit } from "@/lib/rate-limit";
import { POST } from "./route";

const BEAT_ID = "507f1f77bcf86cd799439011";

function makeRequest(body: unknown): NextRequest {
  return new Request("http://localhost/api/beats/id/free-download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("POST /api/beats/[id]/free-download", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(auth).mockResolvedValue(null as never);
    const mockedLimit = rateLimit as unknown as Mock;
    mockedLimit.mockResolvedValue({ success: true, remaining: 9, resetAt: Date.now() + 3600_000 });
  });

  it("returns a download URL on success", async () => {
    vi.mocked(leadService.captureAndGrant).mockResolvedValueOnce({
      downloadUrl: "https://signed.example.com/preview",
      filename: "Night Drive - Preview.mp3",
      expiresIn: 3600,
    });

    const response = await POST(
      makeRequest({ email: "a@b.com", consent: true }),
      { params: Promise.resolve({ id: BEAT_ID }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      downloadUrl: "https://signed.example.com/preview",
      filename: "Night Drive - Preview.mp3",
      expiresIn: 3600,
    });
    expect(leadService.captureAndGrant).toHaveBeenCalledWith(
      BEAT_ID,
      expect.objectContaining({ email: "a@b.com", consent: true }),
      { userId: undefined }
    );
  });

  it("returns 404 when the flag is off", async () => {
    vi.mocked(leadService.captureAndGrant).mockRejectedValueOnce(new NotFoundError("Beat"));

    const response = await POST(
      makeRequest({ email: "a@b.com", consent: true }),
      { params: Promise.resolve({ id: BEAT_ID }) }
    );

    expect(response.status).toBe(404);
  });

  it("returns 400 when consent is missing", async () => {
    const response = await POST(
      makeRequest({ email: "a@b.com" }),
      { params: Promise.resolve({ id: BEAT_ID }) }
    );

    expect(response.status).toBe(400);
    expect(leadService.captureAndGrant).not.toHaveBeenCalled();
  });

  it("returns 429 when rate limited", async () => {
    const mockedLimit = rateLimit as unknown as Mock;
    mockedLimit.mockResolvedValueOnce({ success: false, remaining: 0, resetAt: Date.now() + 30_000 });

    const response = await POST(
      makeRequest({ email: "a@b.com", consent: true }),
      { params: Promise.resolve({ id: BEAT_ID }) }
    );

    expect(response.status).toBe(429);
    expect(leadService.captureAndGrant).not.toHaveBeenCalled();
  });
});
