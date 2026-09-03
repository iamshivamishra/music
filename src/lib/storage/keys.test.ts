import { describe, expect, it } from "vitest";
import { buildBeatKey, buildProfileKey, buildServiceDeliveryKey, isOwnedBeatAssetKey, isOwnedServiceDeliveryKey } from "./keys";

describe("storage keys", () => {
  it("builds canonical beat keys", () => {
    expect(buildBeatKey("p1", "b1", "preview")).toBe(
      "producers/p1/beats/b1/preview.mp3"
    );
    expect(buildBeatKey("p1", "b1", "master")).toBe(
      "producers/p1/beats/b1/master.wav"
    );
  });

  it("builds timestamped profile keys", () => {
    expect(buildProfileKey("p1", "avatar")).toMatch(
      /^producers\/p1\/profile\/avatar-\d+\.jpg$/
    );
  });

  it("accepts owned beat keys and rejects foreign or malformed keys", () => {
    expect(
      isOwnedBeatAssetKey("producers/p1/beats/b1/preview.mp3", "p1", "preview")
    ).toBe(true);
    expect(
      isOwnedBeatAssetKey("producers/other/beats/b1/preview.mp3", "p1", "preview")
    ).toBe(false);
    expect(
      isOwnedBeatAssetKey("producers/p1/beats/b1/nested/preview.mp3", "p1", "preview")
    ).toBe(false);
    expect(
      isOwnedBeatAssetKey("producers/p1/beats/b1/master.wav", "p1", "preview")
    ).toBe(false);
  });

  it("builds and validates service delivery keys", () => {
    expect(buildServiceDeliveryKey("p1", "job1")).toBe(
      "producers/p1/jobs/job1/delivery.zip"
    );
    expect(
      isOwnedServiceDeliveryKey("producers/p1/jobs/job1/delivery.zip", "p1", "job1")
    ).toBe(true);
    expect(
      isOwnedServiceDeliveryKey("producers/other/jobs/job1/delivery.zip", "p1", "job1")
    ).toBe(false);
  });
});
