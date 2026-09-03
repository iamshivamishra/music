import { describe, expect, it } from "vitest";
import { toBeatSplitsDto, toCollabUserMap, collaboratorUserIds } from "./collab";
import type { IBeat } from "@/types";

const beat = {
  _id: "beat_1",
  title: "Night Drive",
  ownerSharePercent: 70,
  splitsStatus: "pending",
  showCollabCredits: true,
  collaborators: [
    {
      userId: "collab_1",
      sharePercent: 30,
      status: "pending" as const,
      invitedAt: new Date("2026-01-01"),
      expiresAt: new Date("2026-01-15"),
    },
  ],
} as IBeat;

describe("collab serializer", () => {
  it("collects unique collaborator ids across beats", () => {
    expect(collaboratorUserIds([beat, beat])).toEqual(["collab_1"]);
  });

  it("hydrates splits from a user map", () => {
    const dto = toBeatSplitsDto(
      beat,
      toCollabUserMap([
        {
          _id: "collab_1",
          username: "meera",
          displayName: "Meera",
          name: "Meera",
        },
      ])
    );

    expect(dto.beatId).toBe("beat_1");
    expect(dto.collaborators[0]).toMatchObject({
      userId: "collab_1",
      username: "meera",
      sharePercent: 30,
      status: "pending",
    });
  });
});
