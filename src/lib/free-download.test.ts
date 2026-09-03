import { describe, expect, it } from "vitest";
import {
  canEnableFreeDownload,
  canGrantFreeDownload,
  canShowFreeDownloadCard,
  freeDownloadEnableBlock,
  hasTaggedPreview,
} from "./free-download";
import type { IBeat } from "@/types";

const base = {
  audioTaggedUrl: "https://cdn.example.com/preview.mp3",
  storageKeys: { preview: "preview.mp3" },
  saleMode: "individual" as const,
  status: "published" as const,
  isPublished: true,
  freeDownloadEnabled: true,
};

describe("free-download policy", () => {
  it("hasTaggedPreview is true when a preview key or tagged URL exists", () => {
    expect(hasTaggedPreview({ audioTaggedUrl: "https://x/a.mp3" })).toBe(true);
    expect(
      hasTaggedPreview({ audioTaggedUrl: "", storageKeys: { preview: "p.mp3" } })
    ).toBe(true);
    expect(hasTaggedPreview({ audioTaggedUrl: "" })).toBe(false);
  });

  it("blocks enabling on exclusive, pack_only, or missing preview", () => {
    expect(freeDownloadEnableBlock(base)).toBeNull();
    expect(canEnableFreeDownload(base)).toBe(true);
    expect(freeDownloadEnableBlock({ ...base, exclusiveBuyerId: "buyer_1" })).toBe(
      "exclusive"
    );
    expect(freeDownloadEnableBlock({ ...base, saleMode: "pack_only" })).toBe(
      "pack_only"
    );
    expect(
      freeDownloadEnableBlock({ audioTaggedUrl: "", saleMode: "individual" })
    ).toBe("no_preview");
    expect(canEnableFreeDownload({ ...base, exclusiveBuyerId: "buyer_1" })).toBe(false);
    expect(canEnableFreeDownload({ ...base, saleMode: "pack_only" })).toBe(false);
    expect(
      canEnableFreeDownload({ audioTaggedUrl: "", saleMode: "individual" })
    ).toBe(false);
  });

  it("grants only when listed, flagged, and enableable", () => {
    expect(canGrantFreeDownload(base as IBeat)).toBe(true);
    expect(
      canGrantFreeDownload({ ...base, freeDownloadEnabled: false } as IBeat)
    ).toBe(false);
    expect(
      canGrantFreeDownload({ ...base, status: "unlisted", isPublished: false } as IBeat)
    ).toBe(false);
  });

  it("hides the card after purchase", () => {
    expect(canShowFreeDownloadCard(base as IBeat, false)).toBe(true);
    expect(canShowFreeDownloadCard(base as IBeat, true)).toBe(false);
  });
});
