import { describe, expect, it } from "vitest";
import { updateProfileSchema } from "./auth";

describe("updateProfileSchema socialLinks.whatsappNumber", () => {
  it("normalizes a 10-digit Indian mobile", () => {
    const result = updateProfileSchema.parse({
      socialLinks: { whatsappNumber: "9876543210" },
    });
    expect(result.socialLinks?.whatsappNumber).toBe("9876543210");
  });

  it("strips a +91 prefix", () => {
    const result = updateProfileSchema.parse({
      socialLinks: { whatsappNumber: "+91 98765 43210" },
    });
    expect(result.socialLinks?.whatsappNumber).toBe("9876543210");
  });

  it("allows an empty number", () => {
    const result = updateProfileSchema.parse({
      socialLinks: { whatsappNumber: "" },
    });
    expect(result.socialLinks?.whatsappNumber).toBe("");
  });

  it("rejects an invalid number", () => {
    const result = updateProfileSchema.safeParse({
      socialLinks: { whatsappNumber: "12345" },
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const messages = result.error.issues.map((issue) => issue.message);
    expect(messages).toContain("Enter a 10-digit Indian mobile number");
  });
});
