import { describe, expect, it, vi, type Mock } from "vitest";
import type { NextRequest } from "next/server";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/services/crm.service", () => ({
  crmService: {
    listCustomers: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { auth } from "@/lib/auth";
import { crmService } from "@/lib/services/crm.service";
import { GET } from "./route";

function callGet(url: string) {
  const nextUrl = new URL(url);
  return GET({
    nextUrl,
    headers: new Headers(),
  } as unknown as NextRequest);
}

describe("GET /api/studio/customers", () => {
  it("returns 401 for guests", async () => {
    (auth as unknown as Mock).mockResolvedValueOnce(null);

    const response = await callGet("http://localhost/api/studio/customers");

    expect(response.status).toBe(401);
    expect(crmService.listCustomers).not.toHaveBeenCalled();
  });
});
