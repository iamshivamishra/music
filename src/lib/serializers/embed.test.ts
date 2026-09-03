import { describe, expect, it } from "vitest";
import { toEmbedBeat, toEmbedBeatDetail, toEmbedCatalog } from "./embed";
import type { IBeat, IUser } from "@/types";

const beat = {
  _id: "507f1f77bcf86cd799439011",
  title: "Midnight",
  coverUrl: "https://cdn.example/cover.jpg",
  audioTaggedUrl: "https://cdn.example/preview.mp3",
  genre: "Hip Hop",
  bpm: 140,
  key: "Am",
} as IBeat;

const producer = {
  displayName: "Aryan Beats",
  name: "Aryan",
  username: "aryan",
  avatarUrl: "https://cdn.example/avatar.jpg",
} as IUser;

describe("toEmbedBeatDetail", () => {
  it("maps public fields and appends src=embed", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://trishulbeats.com";
    const dto = toEmbedBeatDetail(beat, producer, 499);
    expect(dto.producerName).toBe("Aryan Beats");
    expect(dto.previewUrl).toBe("https://cdn.example/preview.mp3");
    expect(dto.price).toBe(499);
    expect(dto.pdpUrl).toBe(
      "https://trishulbeats.com/beats/507f1f77bcf86cd799439011?src=embed"
    );
  });
});

describe("toEmbedCatalog", () => {
  it("includes profile and home urls", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://trishulbeats.com";
    const catalog = toEmbedCatalog(producer, [toEmbedBeat(beat, 499)]);
    expect(catalog.profileUrl).toBe(
      "https://trishulbeats.com/producer/aryan?src=embed"
    );
    expect(catalog.homeUrl).toBe("https://trishulbeats.com");
    expect(catalog.beats).toHaveLength(1);
  });
});
