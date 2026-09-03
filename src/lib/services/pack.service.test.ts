import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError } from "@/lib/errors";
import type { IBeat } from "@/types";

vi.mock("@/lib/repositories/pack.repository", () => ({
  packRepository: {
    slugExists: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/beat.repository", () => ({
  beatRepository: {
    findByIds: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: {},
}));

vi.mock("@/lib/repositories/purchase.repository", () => ({
  purchaseRepository: {},
}));

vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));

import { packRepository } from "@/lib/repositories/pack.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { packService } from "./pack.service";

const packInput = {
  title: "Night Pack",
  slug: "night-pack",
  genre: "Trap",
  tags: [],
  beats: [{ beatId: "beat_1", position: 0 }],
  coverImages: [],
  tiers: [
    {
      type: "basic" as const,
      name: "Basic",
      price: 999,
      includesWav: false,
      includesStems: false,
      commercialUse: false,
      streamLimit: 0,
      terms: "Personal use",
      isActive: true,
    },
  ],
  status: "draft" as const,
};

describe("packService.create member visibility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(packRepository.slugExists).mockResolvedValue(false);
  });

  it("rejects unlisted beats as pack members", async () => {
    vi.mocked(beatRepository.findByIds).mockResolvedValueOnce([
      {
        _id: "beat_1",
        title: "Secret Drop",
        producerId: "prod_1",
        status: "unlisted",
        isPublished: false,
      } as IBeat,
    ]);

    await expect(packService.create(packInput, "prod_1")).rejects.toBeInstanceOf(
      ConflictError
    );
    expect(packRepository.create).not.toHaveBeenCalled();
  });

  it("allows published listed beats", async () => {
    vi.mocked(beatRepository.findByIds).mockResolvedValueOnce([
      {
        _id: "beat_1",
        title: "Listed",
        producerId: "prod_1",
        status: "published",
        isPublished: true,
      } as IBeat,
    ]);
    vi.mocked(packRepository.create).mockResolvedValueOnce({ _id: "pack_1" } as never);

    await packService.create(packInput, "prod_1");
    expect(packRepository.create).toHaveBeenCalled();
  });
});
