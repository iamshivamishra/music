import { describe, expect, it, vi, type Mock } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ success: true, remaining: 9, resetAt: Date.now() })),
  getClientIp: vi.fn(() => "127.0.0.1"),
  rateLimitResponse: vi.fn(() => Response.json({ error: "rate_limited" }, { status: 429 })),
}));

vi.mock("@/lib/services/beat.service", () => ({
  beatService: {
    createFromJsonUpload: vi.fn(),
    createFromFormData: vi.fn(),
  },
}));

vi.mock("@/lib/services/storage.service", () => ({
  storageService: {
    uploadBeatFile: vi.fn(),
    uploadBeatAssets: vi.fn(),
    assertOwnedBeatAssetKeys: vi.fn(),
  },
}));

vi.mock("@/lib/validators/beat", () => ({
  createBeatSchema: {
    parse: vi.fn((value) => value),
  },
  beatFilterSchema: {
    parse: vi.fn((value) => value),
  },
}));

vi.mock("@/lib/errors", () => {
  class UnauthorizedError extends Error {
    statusCode = 401;
  }
  class ForbiddenError extends Error {
    statusCode = 403;
  }
  class ValidationError extends Error {
    statusCode = 400;
    constructor(message: string, public errors?: Record<string, string[]>) {
      super(message);
      this.name = "ValidationError";
    }
  }
  return {
    UnauthorizedError,
    ForbiddenError,
    ValidationError,
    formatErrorResponse: (error: unknown) => {
      const statusCode =
        typeof error === "object" &&
        error !== null &&
        "statusCode" in error &&
        typeof error.statusCode === "number"
          ? error.statusCode
          : 500;
      const message =
        error instanceof Error ? error.message : "Request failed";
      return Response.json({ error: message }, { status: statusCode });
    },
  };
});

import { auth } from "@/lib/auth";
import { beatService } from "@/lib/services/beat.service";
import { ValidationError } from "@/lib/errors";
import { POST } from "./route";

describe("POST /api/beats", () => {
  it("rejects JSON uploads without uploadedAssets", async () => {
    const mockedAuth = auth as unknown as Mock;
    mockedAuth.mockResolvedValueOnce({
      user: { id: "producer_1", role: "producer", name: "n", email: "e@e.com" },
      expires: new Date(Date.now() + 1000).toISOString(),
    });
    vi.mocked(beatService.createFromJsonUpload).mockRejectedValueOnce(
      new ValidationError("Preview and master files are required")
    );

    const request = {
      headers: {
        get: () => "application/json",
      },
      json: async () => ({ title: "A", genre: "Trap", status: "draft", tags: [] }),
    } as unknown as NextRequest;
    const response = await POST(request);

    expect(response.status).toBeGreaterThanOrEqual(400);
  });

  it("creates beat from JSON uploadedAssets payload", async () => {
    const mockedAuth = auth as unknown as Mock;
    const body = {
      title: "Night Drive",
      genre: "Trap",
      status: "draft",
      tags: [],
      uploadedAssets: {
        preview: {
          url: "https://cdn.example.com/producers/producer_1/beats/beat_1/preview.mp3",
          key: "producers/producer_1/beats/beat_1/preview.mp3",
        },
        master: {
          url: "https://cdn.example.com/producers/producer_1/beats/beat_1/master.wav",
          key: "producers/producer_1/beats/beat_1/master.wav",
        },
      },
    };

    mockedAuth.mockResolvedValueOnce({
      user: { id: "producer_1", role: "producer", name: "n", email: "e@e.com" },
      expires: new Date(Date.now() + 1000).toISOString(),
    });
    vi.mocked(beatService.createFromJsonUpload).mockResolvedValueOnce({
      _id: "beat_1",
    } as never);

    const request = {
      headers: {
        get: () => "application/json",
      },
      json: async () => body,
    } as unknown as NextRequest;
    const response = await POST(request);

    expect(response.status).toBe(201);
    expect(beatService.createFromJsonUpload).toHaveBeenCalledWith(body, "producer_1");
  });
});
