import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, ValidationError } from "@/lib/errors";
import type { IBeat } from "@/types";
import { visibilityChange, visibilityFields } from "./beat-visibility";

vi.mock("@/lib/repositories/pack.repository", () => ({
  packRepository: {
    findPublishedPackContainingBeat: vi.fn(),
  },
}));

import { packRepository } from "@/lib/repositories/pack.repository";

describe("visibilityFields", () => {
  it("generates a private token when entering unlisted without one", () => {
    const { set, unset } = visibilityFields({ status: "draft" }, "unlisted");
    expect(set.status).toBe("unlisted");
    expect(set.isPublished).toBe(false);
    expect(set.privateToken).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(unset).toContain("publishAt");
  });

  it("keeps an existing unlisted token and optional publishAt", () => {
    const publishAt = new Date("2026-09-10T12:00:00.000Z");
    const { set, unset } = visibilityFields(
      { status: "unlisted", privateToken: "keep-me" },
      "unlisted",
      publishAt
    );
    expect(set.privateToken).toBeUndefined();
    expect(set.publishAt).toEqual(publishAt);
    expect(unset).not.toContain("publishAt");
  });

  it("requires publishAt when scheduling", () => {
    expect(() => visibilityFields({ status: "draft" }, "scheduled")).toThrow(
      ValidationError
    );
  });

  it("clears the private token on publish", () => {
    const { set, unset } = visibilityFields(
      { status: "unlisted", privateToken: "drop-me" },
      "published"
    );
    expect(set.status).toBe("published");
    expect(set.isPublished).toBe(true);
    expect(set.publishedAt).toBeInstanceOf(Date);
    expect(unset).toEqual(expect.arrayContaining(["privateToken", "publishAt"]));
  });
});

describe("visibilityChange", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("blocks unlist and schedule when the beat is in a published pack", async () => {
    vi.mocked(packRepository.findPublishedPackContainingBeat).mockResolvedValue({
      title: "Summer Pack",
    } as never);

    const beat = { _id: "beat_1", status: "published" } as unknown as IBeat;
    await expect(visibilityChange(beat, "unlisted")).rejects.toBeInstanceOf(ConflictError);
    await expect(
      visibilityChange(beat, "scheduled", new Date("2026-09-10T12:00:00.000Z"))
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("applies visibility fields when the beat is not in a published pack", async () => {
    vi.mocked(packRepository.findPublishedPackContainingBeat).mockResolvedValue(null);

    const beat = { _id: "beat_1", status: "draft" } as unknown as IBeat;
    const { set } = await visibilityChange(beat, "unlisted");
    expect(set.status).toBe("unlisted");
    expect(set.privateToken).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
