import { describe, expect, it } from "vitest";
import { toPublicBeatForUi, toPublicBeatPayload } from "./beat";
import type { IBeat } from "../../types";

const sampleBeat: IBeat = {
  _id: "beat_1",
  title: "Night Drive",
  genre: "Trap",
  tags: ["dark"],
  duration: 120,
  producerId: "producer_1",
  audioTaggedUrl: "https://example.com/tagged.mp3",
  audioFullUrl: "https://example.com/master.wav",
  stemsUrl: "https://example.com/stems.zip",
  storageKeys: {
    preview: "preview-key",
    master: "master-key",
    stems: "stems-key",
  },
  status: "published",
  isPublished: true,
  privateToken: "secret-token",
  plays: 10,
  salesCount: 3,
  likesCount: 4,
  saleMode: "individual",
  collaborators: [
    {
      userId: "collab_1",
      sharePercent: 30,
      status: "accepted",
      invitedAt: new Date(),
      expiresAt: new Date(),
    },
  ],
  ownerSharePercent: 70,
  splitsStatus: "active",
  showCollabCredits: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("beat public serializers", () => {
  it("removes sensitive file fields from API payloads", () => {
    const payload = toPublicBeatPayload(sampleBeat);

    expect("audioFullUrl" in payload).toBe(false);
    expect("stemsUrl" in payload).toBe(false);
    expect("storageKeys" in payload).toBe(false);
    expect("privateToken" in payload).toBe(false);
    expect(payload.audioTaggedUrl).toBe(sampleBeat.audioTaggedUrl);
    expect("collaborators" in payload).toBe(false);
    expect("ownerSharePercent" in payload).toBe(false);
    expect("splitsStatus" in payload).toBe(false);
    expect("showCollabCredits" in payload).toBe(false);
    expect("privateToken" in payload).toBe(false);
  });

  it("keeps UI shape while clearing sensitive values", () => {
    const uiBeat = toPublicBeatForUi(sampleBeat);

    expect(uiBeat.audioFullUrl).toBe("");
    expect(uiBeat.stemsUrl).toBeUndefined();
    expect(uiBeat.storageKeys).toBeUndefined();
    expect(uiBeat.privateToken).toBeUndefined();
    expect(uiBeat.audioTaggedUrl).toBe(sampleBeat.audioTaggedUrl);
    expect("collaborators" in uiBeat).toBe(false);
    expect("showCollabCredits" in uiBeat).toBe(false);
  });

  it("attaches public collab credits without split internals", () => {
    const uiBeat = toPublicBeatForUi(sampleBeat, null, [
      { username: "meera", displayName: "Meera" },
    ]);

    expect(uiBeat.collabCredits).toEqual([{ username: "meera", displayName: "Meera" }]);
    expect("ownerSharePercent" in uiBeat).toBe(false);
  });
});
