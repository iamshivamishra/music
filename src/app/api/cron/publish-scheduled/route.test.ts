import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { NextRequest } from "next/server";

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
    publishDueScheduled: vi.fn(),
  },
}));

import { beatService } from "@/lib/services/beat.service";
import { GET } from "./route";

const mockedPublish = vi.mocked(beatService.publishDueScheduled);

function makeRequest(authHeader?: string): NextRequest {
  const headers = new Headers();
  if (authHeader) headers.set("authorization", authHeader);
  return new Request("http://localhost/api/cron/publish-scheduled", {
    method: "GET",
    headers,
  }) as unknown as NextRequest;
}

describe("GET /api/cron/publish-scheduled", () => {
  const originalSecret = process.env.CRON_SECRET;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.CRON_SECRET = "cron-test-secret";
  });

  afterEach(() => {
    process.env.CRON_SECRET = originalSecret;
  });

  it("returns 401 without a bearer secret", async () => {
    const response = await GET(makeRequest());
    expect(response.status).toBe(401);
    expect(mockedPublish).not.toHaveBeenCalled();
  });

  it("returns 401 when CRON_SECRET is unset", async () => {
    delete process.env.CRON_SECRET;
    const response = await GET(makeRequest("Bearer cron-test-secret"));
    expect(response.status).toBe(401);
    expect(mockedPublish).not.toHaveBeenCalled();
  });

  it("returns 200 with a valid bearer secret", async () => {
    mockedPublish.mockResolvedValueOnce({ published: 2, remaining: 0 });

    const response = await GET(makeRequest("Bearer cron-test-secret"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ published: 2, remaining: 0 });
    expect(mockedPublish).toHaveBeenCalledTimes(1);
  });
});
