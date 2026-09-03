import { describe, expect, it } from "vitest";
import { toPublicProducer } from "./producer";
import { toStoreEditorData, toStoreProfile } from "./store";
import type { IBeat, IUser } from "@/types";

function makeProducer(overrides: Partial<IUser> = {}): IUser {
  return {
    _id: "producer_1",
    name: "Arjun",
    email: "secret@example.com",
    role: "producer",
    username: "arjun",
    displayName: "Arjun Beats",
    bio: "Trap from Delhi",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("toPublicProducer", () => {
  it("exposes headline and WhatsApp visibility without private fields", () => {
    const dto = toPublicProducer(
      makeProducer({
        store: { headline: "New drops", showWhatsApp: false },
        payoutDetails: { upiId: "arjun@upi" },
      })
    );

    expect(dto.id).toBe("producer_1");
    expect(dto.store).toEqual({ headline: "New drops", showWhatsApp: false });
    expect(dto).not.toHaveProperty("email");
    expect(dto).not.toHaveProperty("payoutDetails");
  });

  it("defaults showWhatsApp to true when store is unset", () => {
    const dto = toPublicProducer(makeProducer());
    expect(dto.store.showWhatsApp).toBe(true);
    expect(dto.store.headline).toBeUndefined();
  });
});

describe("toStoreProfile", () => {
  it("returns a public producer and merchandising lists", () => {
    const beat = {
      _id: "b1",
      title: "Night",
      producerName: "Arjun Beats",
    } as IBeat;
    const item = { beat, startingPrice: 499 };
    const dto = toStoreProfile({
      producer: makeProducer({ store: { headline: "Fire" } }),
      beats: [item],
      pinned: [item],
      catalog: [],
      featuredPack: null,
      totalPlays: 12,
    });

    expect(dto.producer.store.headline).toBe("Fire");
    expect(dto.beats).toHaveLength(1);
    expect(dto.pinned).toHaveLength(1);
    expect(dto.catalog).toEqual([]);
  });
});

describe("toStoreEditorData", () => {
  it("maps picker rows and never includes the WhatsApp number", () => {
    const dto = toStoreEditorData({
      producer: makeProducer({
        store: { headline: "Fire", pinnedBeatIds: ["b1"] },
        socialLinks: { whatsappNumber: "9876543210" },
      }),
      beats: [
        {
          _id: "b1",
          title: "Night",
          genre: "Trap",
          coverUrl: "https://cdn/cover.jpg",
        } as IBeat,
      ],
      packs: [],
    });

    expect(dto.store.pinnedBeatIds).toEqual(["b1"]);
    expect(dto.producer.hasWhatsApp).toBe(true);
    expect(JSON.stringify(dto)).not.toContain("9876543210");
    expect(dto.beats[0]).toEqual({
      _id: "b1",
      title: "Night",
      genre: "Trap",
      coverUrl: "https://cdn/cover.jpg",
    });
  });
});
