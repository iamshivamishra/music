import { describe, expect, it, vi, type Mock } from "vitest";
import type { NextRequest } from "next/server";
import { NotFoundError, ValidationError } from "@/lib/errors";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: vi.fn(async () => ({ success: true, remaining: 9, resetAt: Date.now() })),
  getClientIp: vi.fn(() => "127.0.0.1"),
  rateLimitResponse: vi.fn(() => Response.json({ error: "rate_limited" }, { status: 429 })),
}));

vi.mock("@/lib/services/receipt.service", () => ({
  receiptService: {
    generateForBuyer: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn() },
}));

import { auth } from "@/lib/auth";
import { receiptService } from "@/lib/services/receipt.service";
import { GET } from "./route";

const ORDER_ID = "507f1f77bcf86cd799439011";
const BUYER_ID = "507f1f77bcf86cd799439012";

function callGet() {
  return GET(new Request("http://localhost") as unknown as NextRequest, {
    params: Promise.resolve({ id: ORDER_ID }),
  });
}

describe("GET /api/orders/[id]/receipt", () => {
  it("returns 401 for guests", async () => {
    (auth as unknown as Mock).mockResolvedValueOnce(null);
    const response = await callGet();
    expect(response.status).toBe(401);
  });

  it("returns 404 when the order is missing or belongs to someone else", async () => {
    (auth as unknown as Mock).mockResolvedValueOnce({
      user: { id: BUYER_ID, email: "a@b.com" },
    });
    vi.mocked(receiptService.generateForBuyer).mockRejectedValueOnce(new NotFoundError("Order"));

    const response = await callGet();
    expect(response.status).toBe(404);
  });

  it("returns 400 for unpaid orders", async () => {
    (auth as unknown as Mock).mockResolvedValueOnce({
      user: { id: BUYER_ID, email: "a@b.com" },
    });
    vi.mocked(receiptService.generateForBuyer).mockRejectedValueOnce(
      new ValidationError("Receipt is only available for paid orders")
    );

    const response = await callGet();
    expect(response.status).toBe(400);
  });

  it("returns a PDF for a paid order owned by the buyer", async () => {
    (auth as unknown as Mock).mockResolvedValueOnce({
      user: { id: BUYER_ID, email: "a@b.com" },
    });
    vi.mocked(receiptService.generateForBuyer).mockResolvedValueOnce({
      buffer: Buffer.from("%PDF-1.4 test"),
      filename: "receipt-rcpt_paid.pdf",
    });

    const response = await callGet();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toContain("receipt-rcpt_paid.pdf");
  });
});
