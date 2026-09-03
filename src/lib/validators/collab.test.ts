import { describe, expect, it } from "vitest";
import { setBeatSplitsSchema } from "./collab";

describe("setBeatSplitsSchema", () => {
  it("requires percents to sum to 100", () => {
    const result = setBeatSplitsSchema.safeParse({
      ownerSharePercent: 70,
      collaborators: [{ username: "a", sharePercent: 20 }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects duplicate usernames", () => {
    const result = setBeatSplitsSchema.safeParse({
      ownerSharePercent: 40,
      collaborators: [
        { username: "same", sharePercent: 30 },
        { username: "same", sharePercent: 30 },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("accepts owner plus one collab", () => {
    const result = setBeatSplitsSchema.safeParse({
      ownerSharePercent: 70,
      collaborators: [{ username: "collabuser", sharePercent: 30 }],
    });
    expect(result.success).toBe(true);
  });
});
