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

vi.mock("@/lib/services/beat.service", () => ({
  beatService: {
    incrementShareCount: vi.fn(),
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

import { beatService } from "@/lib/services/beat.service";
import { rateLimit } from "@/lib/rate-limit";
import { POST } from "./route";

const BEAT_ID = "507f1f77bcf86cd799439011";

function makeRequest(body?: unknown): NextRequest {
  return new Request("http://localhost/api/beats/id/share", {
    method: "POST",
    headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  }) as unknown as NextRequest;
}

describe("POST /api/beats/[id]/share", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("increments the share count", async () => {
    const mockedLimit = rateLimit as unknown as Mock;
    const mockedIncrement = beatService.incrementShareCount as unknown as Mock;
    mockedLimit.mockResolvedValueOnce({ success: true, remaining: 29, resetAt: Date.now() + 60_000 });
    mockedIncrement.mockResolvedValueOnce(undefined);

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ id: BEAT_ID }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(mockedIncrement).toHaveBeenCalledWith(BEAT_ID, undefined);
  });

  it("records an allowlisted whatsapp source", async () => {
    const mockedLimit = rateLimit as unknown as Mock;
    mockedLimit.mockResolvedValueOnce({ success: true, remaining: 29, resetAt: Date.now() + 60_000 });
    vi.mocked(beatService.incrementShareCount).mockResolvedValueOnce(undefined);

    const response = await POST(makeRequest({ source: "whatsapp" }), {
      params: Promise.resolve({ id: BEAT_ID }),
    });

    expect(response.status).toBe(200);
    expect(beatService.incrementShareCount).toHaveBeenCalledWith(BEAT_ID, "whatsapp");
  });

  it("forwards an unknown source to the service", async () => {
    const mockedLimit = rateLimit as unknown as Mock;
    mockedLimit.mockResolvedValueOnce({ success: true, remaining: 29, resetAt: Date.now() + 60_000 });
    vi.mocked(beatService.incrementShareCount).mockResolvedValueOnce(undefined);

    const response = await POST(makeRequest({ source: "not-a-source" }), {
      params: Promise.resolve({ id: BEAT_ID }),
    });

    expect(response.status).toBe(200);
    expect(beatService.incrementShareCount).toHaveBeenCalledWith(BEAT_ID, "not-a-source");
  });

  it("returns 404 when the beat is unpublished or missing", async () => {
    const mockedLimit = rateLimit as unknown as Mock;
    const mockedIncrement = beatService.incrementShareCount as unknown as Mock;
    mockedLimit.mockResolvedValueOnce({ success: true, remaining: 29, resetAt: Date.now() + 60_000 });
    mockedIncrement.mockRejectedValueOnce(new NotFoundError("Beat"));

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ id: BEAT_ID }),
    });

    expect(response.status).toBe(404);
  });

  it("returns 429 when rate limited", async () => {
    const mockedLimit = rateLimit as unknown as Mock;
    mockedLimit.mockResolvedValueOnce({ success: false, remaining: 0, resetAt: Date.now() + 30_000 });

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ id: BEAT_ID }),
    });

    expect(response.status).toBe(429);
    expect(beatService.incrementShareCount).not.toHaveBeenCalled();
  });
});
