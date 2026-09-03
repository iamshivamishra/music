import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/repositories/purchase.repository", () => ({
  purchaseRepository: {
    hasPurchased: vi.fn(),
    findByBuyerAndBeat: vi.fn(),
    findByIdAndBuyer: vi.fn(),
    findByOrderId: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/pack.repository", () => ({
  packRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/license.repository", () => ({
  licenseRepository: {
    findById: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/beat.repository", () => ({
  beatRepository: {
    findById: vi.fn(),
    findByIdWithKeys: vi.fn(),
    findByIds: vi.fn(),
  },
}));

vi.mock("@/lib/services/storage.service", () => ({
  storageService: {
    SIGNED_URL_TTL_SECONDS: 900,
    getDownloadUrlForValue: vi.fn(),
  },
}));

vi.mock("@/lib/security/entitlements", () => ({
  resolvePurchaseEntitlements: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
  },
}));

vi.mock("@/lib/audit", () => ({
  audit: vi.fn(),
}));

vi.mock("@/lib/errors", () => {
  class ForbiddenError extends Error {
    constructor(message?: string) {
      super(message);
      this.name = "ForbiddenError";
    }
  }
  class NotFoundError extends Error {
    constructor(resource: string) {
      super(`${resource} not found`);
      this.name = "NotFoundError";
    }
  }
  return { ForbiddenError, NotFoundError };
});

import { beatRepository } from "@/lib/repositories/beat.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { storageService } from "@/lib/services/storage.service";
import { resolvePurchaseEntitlements } from "@/lib/security/entitlements";
import { downloadService } from "./download.service";

describe("downloadService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(resolvePurchaseEntitlements).mockReturnValue({
      wavAllowed: true,
      stemsAllowed: true,
      licenseMatchesBeat: true,
    });
  });

  it("prefers storageKeys for signed URL generation", async () => {
    vi.mocked(purchaseRepository.hasPurchased).mockResolvedValueOnce(true);
    vi.mocked(purchaseRepository.findByBuyerAndBeat).mockResolvedValueOnce([
      { _id: "purchase_1", licenseId: "license_1", licenseType: "premium" },
    ] as never);
    vi.mocked(licenseRepository.findById).mockResolvedValueOnce({} as never);
    vi.mocked(beatRepository.findById).mockResolvedValueOnce({
      _id: "beat_1",
      title: "Night Drive",
      audioTaggedUrl: "https://cdn.example.com/preview.mp3",
      audioFullUrl: "https://cdn.example.com/master.wav",
      status: "published",
      isPublished: true,
      genre: "Trap",
      tags: [],
      duration: 120,
      producerId: "producer_1",
      plays: 0,
      salesCount: 0,
      likesCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
      storageKeys: {
        master: "producers/p1/beats/b1/master.wav",
      },
    } as never);
    vi.mocked(storageService.getDownloadUrlForValue).mockResolvedValueOnce("https://signed.example.com/master");

    const result = await downloadService.getSignedUrl("buyer_1", "beat_1", "master");

    expect(storageService.getDownloadUrlForValue).toHaveBeenCalledWith(
      "producers/p1/beats/b1/master.wav",
      { expiresInSeconds: 900 }
    );
    expect(result.url).toBe("https://signed.example.com/master");
  });

  it("falls back to the stored file URL when storageKeys are missing", async () => {
    vi.mocked(purchaseRepository.hasPurchased).mockResolvedValueOnce(true);
    vi.mocked(purchaseRepository.findByBuyerAndBeat).mockResolvedValueOnce([
      { _id: "purchase_1", licenseId: "license_1", licenseType: "premium" },
    ] as never);
    vi.mocked(licenseRepository.findById).mockResolvedValueOnce({} as never);
    vi.mocked(beatRepository.findById).mockResolvedValueOnce({
      _id: "beat_1",
      title: "Night Drive",
      audioTaggedUrl: "https://cdn.example.com/producers/p1/beats/b1/preview.mp3",
      audioFullUrl: "https://cdn.example.com/producers/p1/beats/b1/master.wav",
      status: "published",
      isPublished: true,
      genre: "Trap",
      tags: [],
      duration: 120,
      producerId: "producer_1",
      plays: 0,
      salesCount: 0,
      likesCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as never);
    vi.mocked(storageService.getDownloadUrlForValue).mockResolvedValueOnce("https://signed.example.com/master");

    const result = await downloadService.getSignedUrl("buyer_1", "beat_1", "master");

    expect(storageService.getDownloadUrlForValue).toHaveBeenCalledWith(
      "https://cdn.example.com/producers/p1/beats/b1/master.wav",
      { expiresInSeconds: 900 }
    );
    expect(result.url).toBe("https://signed.example.com/master");
  });
});

describe("downloadService.getSignedUrlByPurchase", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const archivedBeat = {
    _id: "beat_1",
    title: "Night Drive",
    audioTaggedUrl: "https://cdn.example.com/preview.mp3",
    audioFullUrl: "https://cdn.example.com/master.wav",
    stemsUrl: "https://cdn.example.com/stems.zip",
    status: "archived",
    isPublished: false,
    genre: "Trap",
    tags: [],
    duration: 120,
    producerId: "producer_1",
    plays: 0,
    salesCount: 0,
    likesCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    storageKeys: {
      preview: "producers/p1/beats/b1/preview.mp3",
      master: "producers/p1/beats/b1/master.wav",
      stems: "producers/p1/beats/b1/stems.zip",
    },
  };

  it("rejects callers who do not own the purchase", async () => {
    vi.mocked(purchaseRepository.findByIdAndBuyer).mockResolvedValueOnce(null);

    await expect(
      downloadService.getSignedUrlByPurchase("purchase_1", "buyer_1", "preview")
    ).rejects.toMatchObject({ name: "NotFoundError" });
  });

  it("rejects WAV when the purchase does not include it", async () => {
    vi.mocked(resolvePurchaseEntitlements).mockReturnValueOnce({
      wavAllowed: false,
      stemsAllowed: false,
      licenseMatchesBeat: false,
    });
    vi.mocked(purchaseRepository.findByIdAndBuyer).mockResolvedValueOnce({
      _id: "purchase_1",
      beatId: "beat_1",
      includesWav: false,
      includesStems: false,
    } as never);
    vi.mocked(beatRepository.findById).mockResolvedValueOnce(archivedBeat as never);

    await expect(
      downloadService.getSignedUrlByPurchase("purchase_1", "buyer_1", "master")
    ).rejects.toMatchObject({ name: "ForbiddenError" });
    expect(storageService.getDownloadUrlForValue).not.toHaveBeenCalled();
  });

  it("rejects stems when the purchase does not include them", async () => {
    vi.mocked(resolvePurchaseEntitlements).mockReturnValueOnce({
      wavAllowed: true,
      stemsAllowed: false,
      licenseMatchesBeat: false,
    });
    vi.mocked(purchaseRepository.findByIdAndBuyer).mockResolvedValueOnce({
      _id: "purchase_1",
      beatId: "beat_1",
      includesWav: true,
      includesStems: false,
    } as never);
    vi.mocked(beatRepository.findById).mockResolvedValueOnce(archivedBeat as never);

    await expect(
      downloadService.getSignedUrlByPurchase("purchase_1", "buyer_1", "stems")
    ).rejects.toMatchObject({ name: "ForbiddenError" });
  });

  it("signs files for an archived beat the buyer purchased", async () => {
    vi.mocked(purchaseRepository.findByIdAndBuyer).mockResolvedValueOnce({
      _id: "purchase_1",
      beatId: "beat_1",
      includesWav: true,
      includesStems: false,
    } as never);
    vi.mocked(beatRepository.findById).mockResolvedValueOnce(archivedBeat as never);
    vi.mocked(storageService.getDownloadUrlForValue).mockResolvedValueOnce(
      "https://signed.example.com/master"
    );

    const result = await downloadService.getSignedUrlByPurchase(
      "purchase_1",
      "buyer_1",
      "master"
    );

    expect(storageService.getDownloadUrlForValue).toHaveBeenCalledWith(
      "producers/p1/beats/b1/master.wav",
      { expiresInSeconds: 900 }
    );
    expect(result.filename).toBe("Night Drive.wav");
    expect(result.url).toBe("https://signed.example.com/master");
  });
});

describe("downloadService.getTaggedPreviewDownload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signs the preview storage key and never master or stems", async () => {
    vi.mocked(beatRepository.findByIdWithKeys).mockResolvedValueOnce({
      _id: "beat_1",
      title: "Night Drive",
      audioTaggedUrl: "https://cdn.example.com/preview.mp3",
      storageKeys: {
        preview: "producers/p1/beats/b1/preview.mp3",
        master: "producers/p1/beats/b1/master.wav",
        stems: "producers/p1/beats/b1/stems.zip",
      },
    } as never);
    vi.mocked(storageService.getDownloadUrlForValue).mockResolvedValueOnce(
      "https://signed.example.com/preview"
    );

    const result = await downloadService.getTaggedPreviewDownload("beat_1");

    expect(storageService.getDownloadUrlForValue).toHaveBeenCalledTimes(1);
    expect(storageService.getDownloadUrlForValue).toHaveBeenCalledWith(
      "producers/p1/beats/b1/preview.mp3",
      { expiresInSeconds: 3600 }
    );
    expect(result.filename).toBe("Night Drive - Preview.mp3");
    expect(result.url).toBe("https://signed.example.com/preview");
    expect(result.expiresInSeconds).toBe(3600);
  });

  it("falls back to audioTaggedUrl when the preview key is missing", async () => {
    vi.mocked(beatRepository.findByIdWithKeys).mockResolvedValueOnce({
      _id: "beat_1",
      title: "Night Drive",
      audioTaggedUrl: "https://cdn.example.com/tagged.mp3",
      storageKeys: {
        master: "producers/p1/beats/b1/master.wav",
      },
    } as never);
    vi.mocked(storageService.getDownloadUrlForValue).mockResolvedValueOnce(
      "https://signed.example.com/tagged"
    );

    await downloadService.getTaggedPreviewDownload("beat_1");

    expect(storageService.getDownloadUrlForValue).toHaveBeenCalledWith(
      "https://cdn.example.com/tagged.mp3",
      { expiresInSeconds: 3600 }
    );
  });

  it("throws when the beat is missing", async () => {
    vi.mocked(beatRepository.findByIdWithKeys).mockResolvedValueOnce(null);

    await expect(
      downloadService.getTaggedPreviewDownload("missing")
    ).rejects.toMatchObject({ name: "NotFoundError" });
    expect(storageService.getDownloadUrlForValue).not.toHaveBeenCalled();
  });
});

describe("downloadService.getGuestDownloadLinks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const guestBeat = {
    _id: "beat_1",
    title: "Night Drive",
    coverUrl: "https://cdn.example.com/cover.jpg",
    audioTaggedUrl: "https://cdn.example.com/preview.mp3",
    audioFullUrl: "https://cdn.example.com/master.wav",
    stemsUrl: "https://cdn.example.com/stems.zip",
    status: "published",
    isPublished: true,
    genre: "Trap",
    tags: [],
    duration: 120,
    producerId: "producer_1",
    plays: 0,
    salesCount: 0,
    likesCount: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  it("omits WAV when the guest license does not include it", async () => {
    vi.mocked(purchaseRepository.findByOrderId).mockResolvedValueOnce([
      {
        _id: "purchase_1",
        beatId: "beat_1",
        licenseId: "license_1",
        licenseType: "basic",
        amount: 499,
        includesWav: false,
        includesStems: false,
      },
    ] as never);
    vi.mocked(beatRepository.findByIds).mockResolvedValueOnce([guestBeat] as never);
    vi.mocked(resolvePurchaseEntitlements).mockReturnValueOnce({
      wavAllowed: false,
      stemsAllowed: false,
      licenseMatchesBeat: true,
    });
    vi.mocked(storageService.getDownloadUrlForValue).mockResolvedValue(
      "https://signed.example.com/preview"
    );

    const items = await downloadService.getGuestDownloadLinks("rzp_1");
    const master = items[0]?.links.find((link) => link.type === "master");
    const stems = items[0]?.links.find((link) => link.type === "stems");

    expect(master?.available).toBe(false);
    expect(stems?.available).toBe(false);
  });

  it("signs stems when the guest license includes them", async () => {
    vi.mocked(purchaseRepository.findByOrderId).mockResolvedValueOnce([
      {
        _id: "purchase_1",
        beatId: "beat_1",
        licenseId: "license_1",
        licenseType: "unlimited",
        amount: 1499,
        includesWav: true,
        includesStems: true,
      },
    ] as never);
    vi.mocked(beatRepository.findByIds).mockResolvedValueOnce([guestBeat] as never);
    vi.mocked(resolvePurchaseEntitlements).mockReturnValueOnce({
      wavAllowed: true,
      stemsAllowed: true,
      licenseMatchesBeat: true,
    });
    vi.mocked(storageService.getDownloadUrlForValue).mockResolvedValue(
      "https://signed.example.com/file"
    );

    const items = await downloadService.getGuestDownloadLinks("rzp_1");
    const stems = items[0]?.links.find((link) => link.type === "stems");
    const master = items[0]?.links.find((link) => link.type === "master");

    expect(master?.available).toBe(true);
    expect(stems?.available).toBe(true);
    expect(stems?.url).toBe("https://signed.example.com/file");
  });
});
