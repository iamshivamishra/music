import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import crypto from "crypto";

describe("razorpay signatures", () => {
  const originalKey = process.env.RAZORPAY_KEY_SECRET;
  const originalWebhook = process.env.RAZORPAY_WEBHOOK_SECRET;

  beforeEach(() => {
    process.env.RAZORPAY_KEY_SECRET = "test_key_secret";
    process.env.RAZORPAY_WEBHOOK_SECRET = "test_webhook_secret";
    vi.resetModules();
  });

  afterEach(() => {
    process.env.RAZORPAY_KEY_SECRET = originalKey;
    process.env.RAZORPAY_WEBHOOK_SECRET = originalWebhook;
  });

  it("accepts a matching payment signature and rejects a mismatch", async () => {
    const { verifySignature } = await import("./razorpay");
    const orderId = "order_abc";
    const paymentId = "pay_abc";
    const expected = crypto
      .createHmac("sha256", "test_key_secret")
      .update(`${orderId}|${paymentId}`)
      .digest("hex");

    expect(verifySignature(orderId, paymentId, expected)).toBe(true);
    expect(verifySignature(orderId, paymentId, "0".repeat(expected.length))).toBe(false);
    expect(verifySignature(orderId, paymentId, "short")).toBe(false);
  });

  it("accepts a matching webhook signature and rejects a mismatch", async () => {
    const { verifyWebhookSignature } = await import("./razorpay");
    const body = JSON.stringify({ event: "payment.captured" });
    const expected = crypto
      .createHmac("sha256", "test_webhook_secret")
      .update(body)
      .digest("hex");

    expect(verifyWebhookSignature(body, expected)).toBe(true);
    expect(verifyWebhookSignature(body, "f".repeat(expected.length))).toBe(false);
  });
});
