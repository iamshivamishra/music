import { describe, expect, it } from "vitest";
import {
  purchaseConfirmationHtml,
  saleNotificationHtml,
  PURCHASE_EMAIL_TRUNCATE_THRESHOLD,
  PURCHASE_EMAIL_VISIBLE_ITEMS,
} from "./templates";
import { formatPurchaseConfirmationSubject } from "./types";

function item(overrides: Partial<Parameters<typeof purchaseConfirmationHtml>[0]["items"][number]> = {}) {
  return {
    beatTitle: "Dark Trap Melody",
    producerName: "ProducerX",
    licenseType: "premium",
    licenseName: "Premium License",
    price: 1499,
    downloads: [{ label: "Download WAV", url: "https://signed.example.com/master.wav?x=1&y=2" }],
    ...overrides,
  };
}

describe("purchaseConfirmationHtml", () => {
  it("escapes beat titles and omits empty download buttons", () => {
    const html = purchaseConfirmationHtml({
      firstName: "Ada",
      items: [
        item({ beatTitle: "<script>alert(1)</script>", downloads: [] }),
        item({ downloads: [{ label: "Download WAV", url: "" }] }),
      ],
      totalAmount: 1998,
      paymentId: "pay_abc",
      dateStr: "3 September 2026",
      accessUrl: "https://trishulbeats.com/profile/library",
      accessCtaLabel: "Access Your Library",
    });

    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt;");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).not.toContain(">Download WAV<");
    expect(html).not.toContain('href=""');
    expect(html).toContain("Access Your Library");
    expect(html).toContain("support@trishulbeats.com");
  });

  it("renders entitled download buttons and license PDF links", () => {
    const html = purchaseConfirmationHtml({
      firstName: "Ada",
      items: [
        item({
          downloads: [
            { label: "Download WAV", url: "https://signed.example.com/wav" },
            { label: "Download Stems", url: "https://signed.example.com/stems" },
          ],
          licensePdfUrl: "https://trishulbeats.com/api/purchases/p1/license-pdf",
        }),
      ],
      totalAmount: 1499,
      paymentId: "pay_abc",
      dateStr: "3 September 2026",
      accessUrl: "https://trishulbeats.com/profile/library",
      accessCtaLabel: "Access Your Library",
    });

    expect(html).toContain("Download WAV");
    expect(html).toContain("Download Stems");
    expect(html).toContain("/api/purchases/p1/license-pdf");
    expect(html).toContain("License PDF");
  });

  it("truncates carts with more than 10 items", () => {
    const items = Array.from({ length: PURCHASE_EMAIL_TRUNCATE_THRESHOLD + 2 }, (_, i) =>
      item({ beatTitle: `Beat ${i + 1}` })
    );
    const html = purchaseConfirmationHtml({
      firstName: "Ada",
      items,
      totalAmount: 5000,
      paymentId: "pay_abc",
      dateStr: "3 September 2026",
      accessUrl: "https://trishulbeats.com/profile/library",
      accessCtaLabel: "Access Your Library",
    });

    expect(html).toContain("Beat 1");
    expect(html).toContain(`Beat ${PURCHASE_EMAIL_VISIBLE_ITEMS}`);
    expect(html).not.toContain("Beat 9");
    expect(html).toContain(
      `and ${items.length - PURCHASE_EMAIL_VISIBLE_ITEMS} more in your library`
    );
  });

  it("uses the guest download CTA instead of the library", () => {
    const html = purchaseConfirmationHtml({
      firstName: "Guest",
      items: [item({ downloads: [], licensePdfUrl: undefined })],
      totalAmount: 499,
      paymentId: "pay_abc",
      dateStr: "3 September 2026",
      accessUrl: "https://trishulbeats.com/download/tok123",
      accessCtaLabel: "Download Your Beats",
    });

    expect(html).toContain("Download Your Beats");
    expect(html).toContain("/download/tok123");
    expect(html).not.toContain("Access Your Library");
    expect(html).not.toContain("License PDF");
  });
});

describe("formatPurchaseConfirmationSubject", () => {
  it("uses the receipt id", () => {
    expect(formatPurchaseConfirmationSubject("rcpt_abc123")).toBe(
      "Your beats are ready! — Order #rcpt_abc123"
    );
  });
});

describe("saleNotificationHtml", () => {
  it("includes the buyer name and studio CTA", () => {
    const html = saleNotificationHtml({
      firstName: "Priya",
      buyerName: "Ada Lovelace",
      items: [{ beatTitle: "Dark Trap Melody", licenseName: "Premium License", amount: 1499 }],
      totalAmount: 1499,
      dateStr: "3 September 2026",
      studioUrl: "https://trishulbeats.com/studio",
    });

    expect(html).toContain("Ada Lovelace");
    expect(html).toContain("Premium License");
    expect(html).toContain("View in Studio Dashboard");
  });
});
