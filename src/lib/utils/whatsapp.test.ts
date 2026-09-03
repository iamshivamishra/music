import { describe, expect, it } from "vitest";
import {
  buildBeatInquireText,
  buildBeatShareText,
  buildProfileInquireText,
  buildServiceInquireText,
  buildStoreShareText,
  buildWhatsAppBeatShareUrl,
  buildWhatsAppInquireUrl,
  buildWhatsAppShareUrl,
  normalizeWhatsAppNumber,
} from "./whatsapp";

describe("normalizeWhatsAppNumber", () => {
  it("returns empty string for empty or whitespace input", () => {
    expect(normalizeWhatsAppNumber("")).toBe("");
    expect(normalizeWhatsAppNumber("   ")).toBe("");
    expect(normalizeWhatsAppNumber(undefined)).toBe("");
    expect(normalizeWhatsAppNumber(null)).toBe("");
  });

  it("accepts a 10-digit Indian mobile", () => {
    expect(normalizeWhatsAppNumber("9876543210")).toBe("9876543210");
  });

  it("strips spaces and dashes", () => {
    expect(normalizeWhatsAppNumber("98765 43210")).toBe("9876543210");
    expect(normalizeWhatsAppNumber("98765-43210")).toBe("9876543210");
  });

  it("strips a +91 or 91 country prefix", () => {
    expect(normalizeWhatsAppNumber("+919876543210")).toBe("9876543210");
    expect(normalizeWhatsAppNumber("+91 98765 43210")).toBe("9876543210");
    expect(normalizeWhatsAppNumber("919876543210")).toBe("9876543210");
  });

  it("does not strip 91 from a 10-digit number that starts with 9", () => {
    expect(normalizeWhatsAppNumber("9187654321")).toBe("9187654321");
  });

  it("returns null for invalid numbers", () => {
    expect(normalizeWhatsAppNumber("1234567890")).toBeNull();
    expect(normalizeWhatsAppNumber("98765")).toBeNull();
    expect(normalizeWhatsAppNumber("abcdefghij")).toBe("");
    expect(normalizeWhatsAppNumber("5876543210")).toBeNull();
  });
});

describe("buildBeatShareText", () => {
  it("includes title, producer, and url", () => {
    expect(
      buildBeatShareText("Midnight", "Arjun", "https://trishulbeats.com/beats/abc")
    ).toBe(
      'Check out "Midnight" by Arjun on Trishul Beats! https://trishulbeats.com/beats/abc'
    );
  });

  it("omits producer when missing", () => {
    expect(
      buildBeatShareText("Midnight", undefined, "https://trishulbeats.com/beats/abc")
    ).toBe('Check out "Midnight" on Trishul Beats! https://trishulbeats.com/beats/abc');
  });

  it("stays under 200 characters by truncating the title", () => {
    const title = "A".repeat(180);
    const text = buildBeatShareText(
      title,
      "Producer Name",
      "https://trishulbeats.com/beats/507f1f77bcf86cd799439011"
    );
    expect(text.length).toBeLessThanOrEqual(200);
    expect(text).toContain("…");
    expect(text).toContain("https://trishulbeats.com/beats/507f1f77bcf86cd799439011");
  });
});

describe("WhatsApp URLs", () => {
  it("tags beat share URLs with src=whatsapp", () => {
    const url = buildWhatsAppBeatShareUrl(
      "Midnight",
      "Arjun",
      "https://trishulbeats.com/beats/abc"
    );
    const text = decodeURIComponent(url.replace("https://wa.me/?text=", ""));
    expect(text).toContain("https://trishulbeats.com/beats/abc?src=whatsapp");
  });
  it("encodes special characters in share text", () => {
    const text = buildBeatShareText(
      'A&B "Mix"',
      "MC",
      "https://trishulbeats.com/beats/1"
    );
    const url = buildWhatsAppShareUrl(text);
    expect(url.startsWith("https://wa.me/?text=")).toBe(true);
    expect(url).not.toContain('"');
    expect(decodeURIComponent(url.replace("https://wa.me/?text=", ""))).toBe(text);
  });

  it("encodes non-ASCII titles", () => {
    const text = buildBeatShareText("शानदार", "राहुल", "https://example.com/b");
    const url = buildWhatsAppShareUrl(text);
    expect(decodeURIComponent(url.replace("https://wa.me/?text=", ""))).toBe(text);
  });

  it("builds an inquire URL for a valid number", () => {
    const text = buildBeatInquireText('Fire & Ice');
    const url = buildWhatsAppInquireUrl("+91 98765 43210", text);
    expect(url).toBe(
      `https://wa.me/91${"9876543210"}?text=${encodeURIComponent(text)}`
    );
  });

  it("returns null for a missing or invalid inquire number", () => {
    expect(buildWhatsAppInquireUrl("", buildProfileInquireText())).toBeNull();
    expect(buildWhatsAppInquireUrl("123", buildProfileInquireText())).toBeNull();
  });
});

describe("buildStoreShareText", () => {
  it("includes the producer name and url", () => {
    expect(
      buildStoreShareText("Arjun Beats", "https://trishulbeats.com/p/arjun")
    ).toBe(
      "Check out Arjun Beats's beats on Trishul Beats! https://trishulbeats.com/p/arjun"
    );
  });

  it("stays under 200 characters by truncating the name", () => {
    const text = buildStoreShareText(
      "A".repeat(180),
      "https://trishulbeats.com/p/arjun"
    );
    expect(text.length).toBeLessThanOrEqual(200);
    expect(text).toContain("…");
    expect(text).toContain("https://trishulbeats.com/p/arjun");
  });
});

describe("inquire text", () => {
  it("uses beat-scoped and profile-scoped copy", () => {
    expect(buildBeatInquireText("Midnight")).toBe(
      'Hi! I\'m interested in your beat "Midnight" on Trishul Beats.'
    );
    expect(buildProfileInquireText()).toBe(
      "Hi! I'm interested in your beats on Trishul Beats."
    );
    expect(buildServiceInquireText("Custom trap beat")).toBe(
      'Hi! I\'m interested in your service "Custom trap beat" on Trishul Beats.'
    );
  });
});
