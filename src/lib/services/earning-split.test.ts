import { describe, expect, it } from "vitest";
import { resolveActiveShares, splitAmountInPaise } from "./earning-split";
import type { IBeat } from "@/types";

describe("splitAmountInPaise", () => {
  it("splits 70/30 of ₹100 with no remainder", () => {
    const rows = splitAmountInPaise(100, [
      { producerId: "owner", percent: 70, isOwner: true },
      { producerId: "collab", percent: 30, isOwner: false },
    ]);

    expect(rows).toEqual([
      { producerId: "owner", grossAmount: 70, sharePercent: 70, isOwner: true },
      { producerId: "collab", grossAmount: 30, sharePercent: 30, isOwner: false },
    ]);
    expect(rows.reduce((sum, row) => sum + row.grossAmount, 0)).toBe(100);
  });

  it("gives leftover paise to the owner on 70/30 of ₹99", () => {
    const rows = splitAmountInPaise(99, [
      { producerId: "owner", percent: 70, isOwner: true },
      { producerId: "collab", percent: 30, isOwner: false },
    ]);

    const owner = rows.find((row) => row.isOwner)!;
    const collab = rows.find((row) => row.producerId === "collab")!;
    expect(collab.grossAmount).toBe(29.7);
    expect(owner.grossAmount).toBe(69.3);
    expect(owner.grossAmount + collab.grossAmount).toBe(99);
  });

  it("splits 33/33/34 with remainder to owner", () => {
    const rows = splitAmountInPaise(100, [
      { producerId: "owner", percent: 34, isOwner: true },
      { producerId: "a", percent: 33, isOwner: false },
      { producerId: "b", percent: 33, isOwner: false },
    ]);

    expect(rows.find((row) => row.producerId === "a")?.grossAmount).toBe(33);
    expect(rows.find((row) => row.producerId === "b")?.grossAmount).toBe(33);
    expect(rows.find((row) => row.isOwner)?.grossAmount).toBe(34);
  });

  it("credits 100% to the owner", () => {
    const rows = splitAmountInPaise(1499, [
      { producerId: "owner", percent: 100, isOwner: true },
    ]);

    expect(rows).toEqual([
      { producerId: "owner", grossAmount: 1499, sharePercent: 100, isOwner: true },
    ]);
  });
});

describe("resolveActiveShares", () => {
  const base = {
    producerId: "owner",
    ownerSharePercent: 70,
    collaborators: [
      {
        userId: "collab",
        sharePercent: 30,
        status: "accepted" as const,
        invitedAt: new Date(),
        expiresAt: new Date(),
      },
    ],
  };

  it("returns 100% owner when splits are inactive", () => {
    expect(resolveActiveShares({ ...base, splitsStatus: "inactive" })).toEqual([
      { producerId: "owner", percent: 100, isOwner: true },
    ]);
  });

  it("returns 100% owner when splits are pending", () => {
    expect(
      resolveActiveShares({
        ...base,
        splitsStatus: "pending",
        collaborators: [{ ...base.collaborators[0], status: "pending" }],
      })
    ).toEqual([{ producerId: "owner", percent: 100, isOwner: true }]);
  });

  it("returns owner + accepted collabs when active", () => {
    expect(resolveActiveShares({ ...base, splitsStatus: "active" } as Pick<
      IBeat,
      "producerId" | "splitsStatus" | "ownerSharePercent" | "collaborators"
    >)).toEqual([
      { producerId: "owner", percent: 70, isOwner: true },
      { producerId: "collab", percent: 30, isOwner: false },
    ]);
  });
});
