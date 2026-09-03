import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { NextRequest } from "next/server";
import { ForbiddenError } from "@/lib/errors";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ success: true, remaining: 9, resetAt: Date.now() })),
  getClientIp: vi.fn(() => "127.0.0.1"),
  rateLimitResponse: vi.fn(() => Response.json({ error: "rate_limited" }, { status: 429 })),
}));

vi.mock("@/lib/services/store.service", () => ({
  storeService: {
    updateStore: vi.fn(),
  },
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

import { auth } from "@/lib/auth";
import { storeService } from "@/lib/services/store.service";
import { PATCH } from "./route";

function producerSession() {
  return {
    user: { id: "producer_1", role: "producer", name: "Arjun", email: "a@b.com" },
  };
}

function patchRequest(body: unknown) {
  return new Request("http://localhost/api/studio/store", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("PATCH /api/studio/store", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 for guests", async () => {
    (auth as unknown as Mock).mockResolvedValueOnce(null);

    const response = await PATCH(patchRequest({ pinnedBeatIds: [] }));
    expect(response.status).toBe(401);
  });

  it("returns 403 for buyers", async () => {
    (auth as unknown as Mock).mockResolvedValueOnce({
      user: { id: "buyer_1", role: "buyer", name: "B", email: "b@b.com" },
    });

    const response = await PATCH(patchRequest({ pinnedBeatIds: [] }));
    expect(response.status).toBe(403);
    expect(storeService.updateStore).not.toHaveBeenCalled();
  });

  it("returns 400 for invalid payloads", async () => {
    (auth as unknown as Mock).mockResolvedValueOnce(producerSession());

    const response = await PATCH(
      patchRequest({ pinnedBeatIds: ["1", "2", "3", "4"] })
    );

    expect(response.status).toBe(400);
    expect(storeService.updateStore).not.toHaveBeenCalled();
  });

  it("saves store settings for a producer", async () => {
    (auth as unknown as Mock).mockResolvedValueOnce(producerSession());
    vi.mocked(storeService.updateStore).mockResolvedValueOnce({
      username: "arjun",
      store: { headline: "Drops", pinnedBeatIds: ["1"] },
    } as never);

    const response = await PATCH(
      patchRequest({
        headline: "Drops",
        pinnedBeatIds: ["1"],
        featuredPackId: null,
      })
    );

    expect(response.status).toBe(200);
    expect(storeService.updateStore).toHaveBeenCalledWith(
      "producer_1",
      expect.objectContaining({ headline: "Drops", pinnedBeatIds: ["1"] }),
      "producer_1",
      "producer"
    );
  });

  it("returns 403 when the service forbids the actor", async () => {
    (auth as unknown as Mock).mockResolvedValueOnce(producerSession());
    vi.mocked(storeService.updateStore).mockRejectedValueOnce(
      new ForbiddenError("You can only edit your own store")
    );

    const response = await PATCH(patchRequest({ pinnedBeatIds: [] }));
    expect(response.status).toBe(403);
  });
});
