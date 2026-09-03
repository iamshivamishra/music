import { describe, expect, it } from "vitest";
import {
  beatStatusActionSchema,
  createBeatSchema,
  PUBLISH_AT_MAX_DAYS,
} from "./beat";

const base = {
  title: "Midnight",
  genre: "Trap" as const,
};

describe("beat visibility validators", () => {
  it("requires publishAt when scheduling", () => {
    const result = createBeatSchema.safeParse({
      ...base,
      status: "scheduled",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a publishAt in the past", () => {
    const result = createBeatSchema.safeParse({
      ...base,
      status: "unlisted",
      publishAt: new Date(Date.now() - 60_000).toISOString(),
    });
    expect(result.success).toBe(false);
  });

  it("rejects a publishAt more than 90 days out", () => {
    const result = createBeatSchema.safeParse({
      ...base,
      status: "scheduled",
      publishAt: new Date(
        Date.now() + (PUBLISH_AT_MAX_DAYS + 1) * 24 * 60 * 60 * 1000
      ).toISOString(),
    });
    expect(result.success).toBe(false);
  });

  it("accepts unlisted without publishAt and scheduled with a future date", () => {
    expect(
      createBeatSchema.safeParse({ ...base, status: "unlisted" }).success
    ).toBe(true);
    expect(
      createBeatSchema.safeParse({
        ...base,
        status: "scheduled",
        publishAt: new Date(Date.now() + 86_400_000).toISOString(),
      }).success
    ).toBe(true);
  });

  it("requires status or rotateToken on status actions", () => {
    expect(beatStatusActionSchema.safeParse({}).success).toBe(false);
    expect(beatStatusActionSchema.safeParse({ rotateToken: true }).success).toBe(
      true
    );
  });
});
