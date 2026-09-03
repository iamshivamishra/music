import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  getClientIp: vi.fn(() => "127.0.0.1"),
  rateLimit: vi.fn(async () => ({ success: true, remaining: 4, resetAt: Date.now() })),
  rateLimitResponse: vi.fn(() =>
    Response.json({ error: "rate_limited" }, { status: 429 })
  ),
}));

vi.mock("@/lib/services/auth.service", () => ({
  authService: {
    setRole: vi.fn(),
    getProfile: vi.fn(),
  },
}));

vi.mock("@/lib/services/invitation.service", () => ({
  invitationService: {
    accept: vi.fn(),
  },
}));

import { auth } from "@/lib/auth";
import { authService } from "@/lib/services/auth.service";
import { invitationService } from "@/lib/services/invitation.service";
import { POST } from "./route";

function makeRequest(body: unknown): NextRequest {
  return new Request("http://localhost/api/auth/onboarding", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }) as unknown as NextRequest;
}

describe("POST /api/auth/onboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  it("applies the invite on POST instead of only setting a role", async () => {
    const mockedAuth = auth as unknown as Mock;
    mockedAuth.mockResolvedValueOnce({
      user: { id: "user1", role: "buyer", name: "Riya", email: "riya@example.com" },
      expires: new Date(Date.now() + 1000).toISOString(),
    });
    vi.mocked(invitationService.accept).mockResolvedValue({
      producerTier: "founding",
      platformFeeOverride: 0,
      producerTierExpiresAt: new Date().toISOString(),
    });
    vi.mocked(authService.getProfile).mockResolvedValue({
      _id: "user1",
      name: "Riya",
      email: "riya@example.com",
      role: "producer",
    } as never);

    const response = await POST(
      makeRequest({ role: "producer", inviteToken: "token-abc" })
    );

    expect(response.status).toBe(200);
    expect(invitationService.accept).toHaveBeenCalledWith("token-abc", "user1");
    expect(authService.setRole).not.toHaveBeenCalled();
  });

  it("sets the selected role when no invite token is present", async () => {
    const mockedAuth = auth as unknown as Mock;
    mockedAuth.mockResolvedValueOnce({
      user: { id: "user1", role: "buyer", name: "Riya", email: "riya@example.com" },
      expires: new Date(Date.now() + 1000).toISOString(),
    });
    vi.mocked(authService.setRole).mockResolvedValue({
      _id: "user1",
      role: "buyer",
    } as never);
    vi.mocked(authService.getProfile).mockResolvedValue({
      _id: "user1",
      name: "Riya",
      email: "riya@example.com",
      role: "buyer",
    } as never);

    const response = await POST(makeRequest({ role: "buyer" }));

    expect(response.status).toBe(200);
    expect(authService.setRole).toHaveBeenCalledWith("user1", "buyer");
    expect(invitationService.accept).not.toHaveBeenCalled();
  });
});
