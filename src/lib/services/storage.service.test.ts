import { beforeEach, describe, expect, it, vi } from "vitest";
import { ValidationError } from "@/lib/errors";

vi.mock("@/lib/storage/adapter", () => ({
  storageAdapter: {
    putObject: vi.fn(),
    deleteObject: vi.fn(),
    presignPut: vi.fn(),
    presignGet: vi.fn(),
    publicUrl: vi.fn((key: string) => `https://cdn.example.com/${key}`),
    tryKeyFromPublicUrl: vi.fn((url: string) => {
      const prefix = "https://cdn.example.com/";
      return url.startsWith(prefix) ? url.slice(prefix.length) : null;
    }),
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

import { storageAdapter } from "@/lib/storage/adapter";
import { storageService } from "./storage.service";

describe("storageService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("presigns beat uploads after validating the file", async () => {
    vi.mocked(storageAdapter.presignPut).mockResolvedValueOnce(
      "https://s3.example.com/put"
    );

    const result = await storageService.getPresignedUploadUrl(
      "p1",
      "b1",
      "preview",
      "audio/mpeg",
      1024
    );

    expect(storageAdapter.presignPut).toHaveBeenCalledWith({
      key: "producers/p1/beats/b1/preview.mp3",
      contentType: "audio/mpeg",
      expiresIn: 600,
    });
    expect(result).toEqual({
      uploadUrl: "https://s3.example.com/put",
      publicUrl: "https://cdn.example.com/producers/p1/beats/b1/preview.mp3",
      key: "producers/p1/beats/b1/preview.mp3",
    });
  });

  it("rejects invalid files before calling the adapter", async () => {
    await expect(
      storageService.getPresignedUploadUrl("p1", "b1", "preview", "text/plain", 10)
    ).rejects.toBeInstanceOf(ValidationError);
    expect(storageAdapter.presignPut).not.toHaveBeenCalled();
  });

  it("uploads beat files through the adapter", async () => {
    vi.mocked(storageAdapter.putObject).mockResolvedValueOnce(undefined);
    const file = new File([new Uint8Array(8)], "master.wav", { type: "audio/wav" });

    const result = await storageService.uploadBeatFile(file, "p1", "b1", "master");

    expect(storageAdapter.putObject).toHaveBeenCalledWith({
      key: "producers/p1/beats/b1/master.wav",
      body: expect.any(Buffer),
      contentType: "audio/wav",
    });
    expect(result).toEqual({
      url: "https://cdn.example.com/producers/p1/beats/b1/master.wav",
      key: "producers/p1/beats/b1/master.wav",
    });
  });

  it("rejects beat keys that do not belong to the producer", () => {
    expect(() =>
      storageService.assertOwnedBeatAssetKeys("p1", {
        preview: "producers/other/beats/b1/preview.mp3",
        master: "producers/p1/beats/b1/master.wav",
      })
    ).toThrow(ValidationError);
  });

  it("resolves object keys and signs stored files", async () => {
    vi.mocked(storageAdapter.presignGet).mockResolvedValue("https://signed.example.com");

    await expect(
      storageService.getDownloadUrlForValue("producers/p1/beats/b1/master.wav")
    ).resolves.toBe("https://signed.example.com");
    await expect(
      storageService.getDownloadUrlForValue(
        "https://cdn.example.com/producers/p1/beats/b1/master.wav"
      )
    ).resolves.toBe("https://signed.example.com");
    await expect(
      storageService.getDownloadUrlForValue("https://legacy.example.com/master.wav")
    ).resolves.toBe("https://legacy.example.com/master.wav");
  });

  it("delegates deletes to the adapter", async () => {
    await storageService.deleteFile("producers/p1/beats/b1/master.wav");
    expect(storageAdapter.deleteObject).toHaveBeenCalledWith(
      "producers/p1/beats/b1/master.wav"
    );
  });
});
