import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { NextRequest } from "next/server";
import { NotFoundError } from "@/lib/errors";

vi.mock("@/lib/services/embed.service", () => ({
  embedService: {
    getBeatData: vi.fn(),
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
import { GET, OPTIONS } from "./route";

const BEAT_ID = "507f1f77bcf86cd799439011";

function makeRequest(): NextRequest {
  return new Request(`http://localhost/api/embed/${BEAT_ID}`) as unknown as NextRequest;
}

describe("GET /api/embed/[beatId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns public beat JSON with CORS headers", async () => {
    const mockedLimit = rateLimit as unknown as Mock;
    const mockedGet = embedService.getBeatData as unknown as Mock;
    mockedLimit.mockResolvedValueOnce({ success: true, remaining: 59, resetAt: Date.now() + 60_000 });
    mockedGet.mockResolvedValueOnce({
      title: "Midnight",
      producerName: "Aryan",
      coverUrl: "https://cdn.example/cover.jpg",
      previewUrl: "https://cdn.example/preview.mp3",
      genre: "Hip Hop",
      bpm: 140,
      key: "Am",
      pdpUrl: "https://trishulbeats.com/beats/id?src=embed",
      price: 499,
    });

    const response = await GET(makeRequest(), {
      params: Promise.resolve({ beatId: BEAT_ID }),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    await expect(response.json()).resolves.toMatchObject({
      title: "Midnight",
      producerName: "Aryan",
      price: 499,
    });
  });

  it("returns 404 when the beat is missing", async () => {
    const mockedLimit = rateLimit as unknown as Mock;
    const mockedGet = embedService.getBeatData as unknown as Mock;
    mockedLimit.mockResolvedValueOnce({ success: true, remaining: 59, resetAt: Date.now() + 60_000 });
    mockedGet.mockRejectedValueOnce(new NotFoundError("Beat"));

    const response = await GET(makeRequest(), {
      params: Promise.resolve({ beatId: BEAT_ID }),
    });

    expect(response.status).toBe(404);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("returns 429 when rate limited", async () => {
    const mockedLimit = rateLimit as unknown as Mock;
    mockedLimit.mockResolvedValueOnce({ success: false, remaining: 0, resetAt: Date.now() + 30_000 });

    const response = await GET(makeRequest(), {
      params: Promise.resolve({ beatId: BEAT_ID }),
    });

    expect(response.status).toBe(429);
    expect(embedService.getBeatData).not.toHaveBeenCalled();
  });
});

describe("OPTIONS /api/embed/[beatId]", () => {
  it("returns CORS preflight headers", async () => {
    const response = await OPTIONS();
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Methods")).toContain("GET");
  });
});
