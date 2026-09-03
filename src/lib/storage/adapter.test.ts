import { beforeEach, describe, expect, it, vi } from "vitest";

const send = vi.fn();
const getSignedUrl = vi.fn();

vi.mock("@aws-sdk/client-s3", () => {
  class MockS3Client {
    send = send;
  }

  class MockCommand {
    input: unknown;
    constructor(input: unknown) {
      this.input = input;
    }
  }

  return {
    S3Client: MockS3Client,
    PutObjectCommand: MockCommand,
    DeleteObjectCommand: MockCommand,
    GetObjectCommand: MockCommand,
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: (...args: unknown[]) => getSignedUrl(...args),
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() },
}));

describe("storageAdapter", () => {
  beforeEach(() => {
    vi.resetModules();
    send.mockReset();
    getSignedUrl.mockReset();
    process.env.AWS_S3_REGION = "ap-south-1";
    process.env.AWS_ACCESS_KEY_ID = "test-key";
    process.env.AWS_SECRET_ACCESS_KEY = "test-secret";
    process.env.AWS_S3_BUCKET = "trishul-beats";
    process.env.AWS_S3_PUBLIC_URL = "https://cdn.example.com";
  });

  it("presigns PUT and GET without composing public URLs", async () => {
    getSignedUrl
      .mockResolvedValueOnce("https://s3.amazonaws.com/upload")
      .mockResolvedValueOnce("https://s3.amazonaws.com/signed");
    const { storageAdapter } = await import("./adapter");

    await expect(
      storageAdapter.presignPut({
        key: "producers/p1/beats/b1/preview.mp3",
        contentType: "audio/mpeg",
        expiresIn: 600,
      })
    ).resolves.toBe("https://s3.amazonaws.com/upload");

    await expect(
      storageAdapter.presignGet({
        key: "producers/p1/beats/b1/master.wav",
        expiresIn: 900,
      })
    ).resolves.toBe("https://s3.amazonaws.com/signed");
  });

  it("puts objects and builds public URLs", async () => {
    send.mockResolvedValueOnce({});
    const { storageAdapter } = await import("./adapter");

    await storageAdapter.putObject({
      key: "producers/p1/beats/b1/preview.mp3",
      body: Buffer.from("audio"),
      contentType: "audio/mpeg",
    });

    expect(send).toHaveBeenCalledTimes(1);
    expect(storageAdapter.publicUrl("producers/p1/beats/b1/preview.mp3")).toBe(
      "https://cdn.example.com/producers/p1/beats/b1/preview.mp3"
    );
  });

  it("extracts keys from the public base URL", async () => {
    const { storageAdapter } = await import("./adapter");

    expect(
      storageAdapter.tryKeyFromPublicUrl(
        "https://cdn.example.com/producers/p1/beats/b1/master.wav"
      )
    ).toBe("producers/p1/beats/b1/master.wav");
    expect(
      storageAdapter.tryKeyFromPublicUrl("https://other.example.com/file.wav")
    ).toBeNull();
  });
});
