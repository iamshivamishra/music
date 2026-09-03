import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { NextRequest } from "next/server";
import { NotFoundError } from "@/lib/errors";

vi.mock("@/lib/services/embed.service", () => ({
  embedService: {
    recordView: vi.fn(),
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

import { embedService } from "@/lib/services/embed.service";
import { rateLimit } from "@/lib/rate-limit";
import { POST } from "./route";

const BEAT_ID = "507f1f77bcf86cd799439011";

function makeRequest(): NextRequest {
  return new Request(`http://localhost/api/embed/${BEAT_ID}/view`, {
    method: "POST",
  }) as unknown as NextRequest;
}

describe("POST /api/embed/[beatId]/view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("increments embed views for a published beat", async () => {
    const mockedLimit = rateLimit as unknown as Mock;
    const mockedRecord = embedService.recordView as unknown as Mock;
    mockedLimit.mockResolvedValueOnce({ success: true, remaining: 29, resetAt: Date.now() + 60_000 });
    mockedRecord.mockResolvedValueOnce(undefined);

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ beatId: BEAT_ID }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(mockedRecord).toHaveBeenCalledWith(BEAT_ID);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("returns 404 when the beat is unpublished or missing", async () => {
    const mockedLimit = rateLimit as unknown as Mock;
    const mockedRecord = embedService.recordView as unknown as Mock;
    mockedLimit.mockResolvedValueOnce({ success: true, remaining: 29, resetAt: Date.now() + 60_000 });
    mockedRecord.mockRejectedValueOnce(new NotFoundError("Beat"));

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ beatId: BEAT_ID }),
    });

    expect(response.status).toBe(404);
    expect(embedService.recordView).toHaveBeenCalledWith(BEAT_ID);
  });

  it("returns 429 when rate limited", async () => {
    const mockedLimit = rateLimit as unknown as Mock;
    mockedLimit.mockResolvedValueOnce({ success: false, remaining: 0, resetAt: Date.now() + 30_000 });

    const response = await POST(makeRequest(), {
      params: Promise.resolve({ beatId: BEAT_ID }),
    });

    expect(response.status).toBe(429);
    expect(embedService.recordView).not.toHaveBeenCalled();
  });
});
