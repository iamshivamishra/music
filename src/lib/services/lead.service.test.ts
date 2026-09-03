import { beforeEach, describe, expect, it, vi } from "vitest";
import { NotFoundError } from "@/lib/errors";
import type { IBeat, ILead } from "@/types";

vi.mock("@/lib/repositories/beat.repository", () => ({
  beatRepository: {
    findByIdWithKeys: vi.fn(),
    findByIds: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/lead.repository", () => ({
  leadRepository: {
    upsertByIdentity: vi.fn(),
    listByProducer: vi.fn(),
    distinctBeatIds: vi.fn(),
    listAllForExport: vi.fn(),
  },
}));

vi.mock("@/lib/services/download.service", () => ({
  downloadService: {
    signTaggedPreview: vi.fn(),
    getTaggedPreviewDownload: vi.fn(),
  },
}));

vi.mock("@/lib/services/email.service", () => ({
  emailService: {
    sendTaggedPreviewDownload: vi.fn(),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));

import { beatRepository } from "@/lib/repositories/beat.repository";
import { leadRepository } from "@/lib/repositories/lead.repository";
import { downloadService } from "@/lib/services/download.service";
import { emailService } from "@/lib/services/email.service";
import { leadService } from "./lead.service";

const publishedBeat = {
  _id: "beat_1",
  title: "Night Drive",
  producerId: "producer_1",
  audioTaggedUrl: "https://cdn.example.com/preview.mp3",
  storageKeys: { preview: "producers/p1/beats/b1/preview.mp3" },
  status: "published",
  isPublished: true,
  saleMode: "individual",
  freeDownloadEnabled: true,
  genre: "Trap",
  tags: [],
  duration: 120,
  audioFullUrl: "",
  plays: 0,
  salesCount: 0,
  likesCount: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as IBeat;

const signed = {
  url: "https://signed.example.com/preview",
  filename: "Night Drive - Preview.mp3",
  expiresInSeconds: 3600,
};

const createdLead = {
  _id: "lead_1",
  producerId: "producer_1",
  beatId: "beat_1",
  email: "a@b.com",
  source: "free_download",
  consentAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as ILead;

describe("leadService.captureAndGrant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(downloadService.signTaggedPreview).mockResolvedValue(signed);
    vi.mocked(leadRepository.upsertByIdentity).mockResolvedValue(createdLead);
  });

  it("creates a lead and returns a tagged preview URL", async () => {
    vi.mocked(beatRepository.findByIdWithKeys).mockResolvedValueOnce(publishedBeat);

    const result = await leadService.captureAndGrant("beat_1", {
      email: "a@b.com",
      consent: true,
    });

    expect(leadRepository.upsertByIdentity).toHaveBeenCalledWith(
      expect.objectContaining({
        beatId: "beat_1",
        email: "a@b.com",
        source: "free_download",
      })
    );
    expect(downloadService.signTaggedPreview).toHaveBeenCalledWith(publishedBeat);
    expect(emailService.sendTaggedPreviewDownload).toHaveBeenCalledWith({
      to: "a@b.com",
      beatTitle: "Night Drive",
      downloadUrl: signed.url,
    });
    expect(result).toEqual({
      downloadUrl: signed.url,
      filename: signed.filename,
      expiresIn: 3600,
    });
  });

  it("re-grants through upsert without a second create path in the service", async () => {
    vi.mocked(beatRepository.findByIdWithKeys).mockResolvedValueOnce(publishedBeat);

    await leadService.captureAndGrant("beat_1", {
      email: "a@b.com",
      consent: true,
    });

    expect(leadRepository.upsertByIdentity).toHaveBeenCalledTimes(1);
    expect(downloadService.signTaggedPreview).toHaveBeenCalledWith(publishedBeat);
  });

  it("throws NotFoundError when the flag is off", async () => {
    vi.mocked(beatRepository.findByIdWithKeys).mockResolvedValueOnce({
      ...publishedBeat,
      freeDownloadEnabled: false,
    });

    await expect(
      leadService.captureAndGrant("beat_1", { email: "a@b.com", consent: true })
    ).rejects.toBeInstanceOf(NotFoundError);
    expect(leadRepository.upsertByIdentity).not.toHaveBeenCalled();
    expect(downloadService.signTaggedPreview).not.toHaveBeenCalled();
  });

  it("throws NotFoundError when the beat is unpublished", async () => {
    vi.mocked(beatRepository.findByIdWithKeys).mockResolvedValueOnce({
      ...publishedBeat,
      status: "draft",
      isPublished: false,
    });

    await expect(
      leadService.captureAndGrant("beat_1", { email: "a@b.com", consent: true })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError for unlisted beats", async () => {
    vi.mocked(beatRepository.findByIdWithKeys).mockResolvedValueOnce({
      ...publishedBeat,
      status: "unlisted",
      isPublished: false,
    });

    await expect(
      leadService.captureAndGrant("beat_1", { email: "a@b.com", consent: true })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError for pack_only beats", async () => {
    vi.mocked(beatRepository.findByIdWithKeys).mockResolvedValueOnce({
      ...publishedBeat,
      saleMode: "pack_only",
    });

    await expect(
      leadService.captureAndGrant("beat_1", { email: "a@b.com", consent: true })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("throws NotFoundError for exclusive-sold beats", async () => {
    vi.mocked(beatRepository.findByIdWithKeys).mockResolvedValueOnce({
      ...publishedBeat,
      exclusiveBuyerId: "buyer_1",
    });

    await expect(
      leadService.captureAndGrant("beat_1", { email: "a@b.com", consent: true })
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
