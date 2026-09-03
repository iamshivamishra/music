import { describe, expect, it } from "vitest";
import { captureLeadSchema } from "./lead";

describe("captureLeadSchema", () => {
  it("accepts email only with consent", () => {
    const result = captureLeadSchema.parse({
      email: "Artist@Example.com",
      consent: true,
    });
    expect(result.email).toBe("artist@example.com");
    expect(result.whatsappNumber).toBeUndefined();
    expect(result.consent).toBe(true);
  });

  it("accepts WhatsApp only with consent", () => {
    const result = captureLeadSchema.parse({
      whatsappNumber: "+91 98765 43210",
      consent: true,
    });
    expect(result.email).toBeUndefined();
    expect(result.whatsappNumber).toBe("9876543210");
  });

  it("accepts both email and WhatsApp", () => {
    const result = captureLeadSchema.parse({
      email: "a@b.com",
      whatsappNumber: "9876543210",
      consent: true,
    });
    expect(result.email).toBe("a@b.com");
    expect(result.whatsappNumber).toBe("9876543210");
  });

  it("rejects when neither email nor WhatsApp is provided", () => {
    const result = captureLeadSchema.safeParse({ consent: true });
    expect(result.success).toBe(false);
  });

  it("rejects empty strings as missing identity", () => {
    const result = captureLeadSchema.safeParse({
      email: "  ",
      whatsappNumber: "",
      consent: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects consent false", () => {
    const result = captureLeadSchema.safeParse({
      email: "a@b.com",
      consent: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects missing consent", () => {
    const result = captureLeadSchema.safeParse({
      email: "a@b.com",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid WhatsApp number", () => {
    const result = captureLeadSchema.safeParse({
      whatsappNumber: "12345",
      consent: true,
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid email", () => {
    const result = captureLeadSchema.safeParse({
      email: "not-an-email",
      consent: true,
    });
    expect(result.success).toBe(false);
  });
});
