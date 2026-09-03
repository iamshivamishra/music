import { describe, expect, it, vi, type Mock } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ success: true, remaining: 29, resetAt: Date.now() })),
  getClientIp: vi.fn(() => "127.0.0.1"),
  rateLimitResponse: vi.fn(() => Response.json({ error: "rate_limited" }, { status: 429 })),
}));

vi.mock("@/lib/services/library.service", () => ({
  libraryService: {
    getLibrary: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { auth } from "@/lib/auth";
import { libraryService } from "@/lib/services/library.service";
import { GET } from "./route";

function callGet(url: string) {
  const nextUrl = new URL(url);
  return GET({
    nextUrl,
    headers: new Headers(),
  } as unknown as NextRequest);
}

describe("GET /api/user/library", () => {
  it("returns 401 for guests", async () => {
    (auth as unknown as Mock).mockResolvedValueOnce(null);

    const response = await callGet("http://localhost/api/user/library");

    expect(response.status).toBe(401);
  });

  it("returns 400 for invalid pagination", async () => {
    (auth as unknown as Mock).mockResolvedValueOnce({
      user: { id: "buyer_1", email: "a@b.com" },
    });

    const response = await callGet("http://localhost/api/user/library?page=0");

    expect(response.status).toBe(400);
    expect(libraryService.getLibrary).not.toHaveBeenCalled();
  });

  it("returns the buyer library page", async () => {
    (auth as unknown as Mock).mockResolvedValueOnce({
      user: { id: "buyer_1", email: "a@b.com" },
    });
    vi.mocked(libraryService.getLibrary).mockResolvedValueOnce({
      data: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
      hasNext: false,
      hasPrev: false,
    });

    const response = await callGet("http://localhost/api/user/library?search=trap");

    expect(response.status).toBe(200);
    expect(libraryService.getLibrary).toHaveBeenCalledWith("buyer_1", 1, 20, "trap");
    await expect(response.json()).resolves.toMatchObject({ total: 0, page: 1 });
  });
});
