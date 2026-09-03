import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IUser } from "@/types";

vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/services/store.service", () => ({
  storeService: { getStore: vi.fn() },
}));
vi.mock("@/lib/services/service-listing.service", () => ({
  serviceListingService: { listPublishedForProducer: vi.fn() },
}));
vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: {
    updateAndUnset: vi.fn(),
    findById: vi.fn(),
    update: vi.fn(),
    usernameExists: vi.fn(),
    findBySlug: vi.fn(),
    searchProducersByUsername: vi.fn(),
  },
}));

import { producerService } from "./producer.service";
import { storeService } from "@/lib/services/store.service";
import { serviceListingService } from "@/lib/services/service-listing.service";
import { userRepository } from "@/lib/repositories/user.repository";

const mockedUsers = vi.mocked(userRepository);
const mockedStore = vi.mocked(storeService);
const mockedListings = vi.mocked(serviceListingService);

function makeUser(overrides: Partial<IUser> = {}): IUser {
  return {
    _id: "user1",
    name: "Riya",
    email: "riya@example.com",
    role: "producer",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("producerService.getProfileData", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when the store is missing", async () => {
    mockedStore.getStore.mockResolvedValueOnce(null);

    await expect(producerService.getProfileData("missing")).resolves.toBeNull();
    expect(mockedListings.listPublishedForProducer).not.toHaveBeenCalled();
  });

  it("merges merchandising with published services", async () => {
    mockedStore.getStore.mockResolvedValueOnce({
      producer: {
        id: "producer_1",
        username: "arjun",
        displayName: "Arjun",
        name: "Arjun",
        socialLinks: { whatsappNumber: "919999999999" },
      },
      beats: [],
      pinned: [],
      catalog: [],
      featuredPack: null,
      totalPlays: 12,
    } as never);
    mockedListings.listPublishedForProducer.mockResolvedValueOnce([
      {
        _id: "svc_1",
        producerId: "producer_1",
        type: "mixing",
        title: "Mix + master",
        description: "Full mix and master of your track.",
        startingPrice: 4000,
        depositPercent: 50,
        turnaroundDays: 5,
        extras: [],
        status: "published",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ] as never);

    const result = await producerService.getProfileData("arjun");

    expect(mockedListings.listPublishedForProducer).toHaveBeenCalledWith("producer_1");
    expect(result?.totalPlays).toBe(12);
    expect(result?.services).toEqual([
      expect.objectContaining({
        id: "svc_1",
        title: "Mix + master",
        producerUsername: "arjun",
        whatsappNumber: "919999999999",
      }),
    ]);
  });
});

describe("producerService.updateTier", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("unsets fee override and expiry when setting standard", async () => {
    mockedUsers.updateAndUnset.mockResolvedValue(
      makeUser({ producerTier: "standard" })
    );

    await producerService.updateTier("user1", { producerTier: "standard" }, "admin1");

    expect(mockedUsers.updateAndUnset).toHaveBeenCalledWith(
      "user1",
      { producerTier: "standard" },
      ["platformFeeOverride", "producerTierExpiresAt"]
    );
  });

  it("keeps an explicit override when setting standard", async () => {
    mockedUsers.updateAndUnset.mockResolvedValue(
      makeUser({ producerTier: "standard", platformFeeOverride: 5 })
    );

    await producerService.updateTier(
      "user1",
      { producerTier: "standard", platformFeeOverride: 5 },
      "admin1"
    );

    expect(mockedUsers.updateAndUnset).toHaveBeenCalledWith(
      "user1",
      { producerTier: "standard", platformFeeOverride: 5 },
      ["producerTierExpiresAt"]
    );
  });
});

describe("producerService.ensureProducerAccount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps an existing username and promotes the user to producer", async () => {
    mockedUsers.findById.mockResolvedValue(
      makeUser({ username: "riya", role: "buyer" })
    );
    mockedUsers.update.mockResolvedValue(
      makeUser({ username: "riya", role: "producer" })
    );

    const user = await producerService.ensureProducerAccount("user1");

    expect(user.role).toBe("producer");
    expect(mockedUsers.usernameExists).not.toHaveBeenCalled();
    expect(mockedUsers.update).toHaveBeenCalledWith(
      "user1",
      {
        role: "producer",
        username: "riya",
        displayName: "Riya",
      },
      {}
    );
  });
});

describe("producerService.searchByUsername", () => {
  it("excludes the requester and users without a username", async () => {
    mockedUsers.searchProducersByUsername.mockResolvedValueOnce([
      { _id: "me", username: "arjun", displayName: "Arjun", name: "Arjun" },
      { _id: "other", username: "meera", displayName: "Meera", name: "Meera" },
      { _id: "anon", name: "No Handle" },
    ] as never);

    const result = await producerService.searchByUsername("m", "me");

    expect(result).toEqual([
      {
        id: "other",
        username: "meera",
        displayName: "Meera",
        avatarUrl: undefined,
      },
    ]);
  });
});

describe("producerService.allocateUniqueUsername", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns the base slug when it is free", async () => {
    mockedUsers.usernameExists.mockResolvedValue(false);
    await expect(producerService.allocateUniqueUsername("Riya Sharma")).resolves.toBe(
      "riya-sharma"
    );
  });

  it("appends a suffix when the base slug is taken", async () => {
    mockedUsers.usernameExists.mockResolvedValue(true);
    const username = await producerService.allocateUniqueUsername("Riya", "user1");
    expect(username).toMatch(/^riya-[a-z0-9]+$/);
    expect(mockedUsers.usernameExists).toHaveBeenCalledWith("riya", "user1");
  });
});

describe("producerService.resolveUsernameForRedirect", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when no producer matches the slug", async () => {
    mockedUsers.findBySlug.mockResolvedValue(null);
    await expect(producerService.resolveUsernameForRedirect("old-slug")).resolves.toBeNull();
  });

  it("prefers username over the incoming slug", async () => {
    mockedUsers.findBySlug.mockResolvedValue(makeUser({ username: "riya" }));
    await expect(producerService.resolveUsernameForRedirect("old-slug")).resolves.toBe("riya");
  });
});
