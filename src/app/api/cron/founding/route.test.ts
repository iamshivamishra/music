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

vi.mock("@/lib/services/foundingLifecycle.service", () => ({
  foundingLifecycleService: {
    runDailyJobs: vi.fn(),
  },
}));

import { foundingLifecycleService } from "@/lib/services/foundingLifecycle.service";
import { GET } from "./route";

const mockedJobs = vi.mocked(foundingLifecycleService.runDailyJobs);

function makeRequest(authHeader?: string): NextRequest {
  const headers = new Headers();
  if (authHeader) headers.set("authorization", authHeader);
  return new Request("http://localhost/api/cron/founding", {
    method: "GET",
    headers,
  }) as unknown as NextRequest;
}

describe("GET /api/cron/founding", () => {
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
    expect(mockedJobs).not.toHaveBeenCalled();
  });

  it("returns 200 with a valid bearer secret", async () => {
    mockedJobs.mockResolvedValue({
      expiredInvitations: 1,
      day3Nudges: 0,
      day7Nudges: 0,
      expiredTiers: 0,
    });

    const response = await GET(makeRequest("Bearer cron-test-secret"));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      expiredInvitations: 1,
    });
    expect(mockedJobs).toHaveBeenCalledTimes(1);
  });
});
