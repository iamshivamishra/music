import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";

vi.mock("@/lib/repositories/beat.repository", () => ({
  beatRepository: {
    findById: vi.fn(),
    update: vi.fn(),
    findByCollaboratorUserId: vi.fn(),
    findByProducerId: vi.fn(),
    countPendingInvitesForUser: vi.fn(),
  },
}));

vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: {
    findById: vi.fn(),
    findByIds: vi.fn(),
    findByUsername: vi.fn(),
  },
}));

vi.mock("@/lib/services/email.service", () => ({
  emailService: { sendCollabInvite: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { beatRepository } from "@/lib/repositories/beat.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { collabService } from "./collab.service";
import type { IBeat, IUser } from "@/types";

const owner = {
  _id: "owner_1",
  name: "Owner",
  displayName: "Owner",
  email: "owner@example.com",
  role: "producer",
  username: "owner",
} as IUser;

const collab = {
  _id: "collab_1",
  name: "Collab",
  displayName: "Collab",
  email: "collab@example.com",
  role: "producer",
  username: "collabuser",
} as IUser;

function beat(overrides: Partial<IBeat> = {}): IBeat {
  return {
    _id: "beat_1",
    title: "Night Drive",
    producerId: "owner_1",
    genre: "Trap",
    tags: [],
    duration: 120,
    audioTaggedUrl: "https://example.com/t.mp3",
    audioFullUrl: "https://example.com/m.wav",
    status: "published",
    isPublished: true,
    plays: 0,
    salesCount: 0,
    likesCount: 0,
    saleMode: "individual",
    createdAt: new Date(),
    updatedAt: new Date(),
    splitsStatus: "inactive",
    ownerSharePercent: 100,
    collaborators: [],
    ...overrides,
  };
}

describe("collabService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userRepository.findByIds).mockResolvedValue([]);
  });

  it("rejects inviting yourself", async () => {
    vi.mocked(beatRepository.findById).mockResolvedValue(beat());
    vi.mocked(userRepository.findById).mockResolvedValue(owner);
    vi.mocked(userRepository.findByUsername).mockResolvedValue(owner);

    await expect(
      collabService.setSplits("beat_1", "owner_1", "producer", {
        ownerSharePercent: 70,
        collaborators: [{ username: "owner", sharePercent: 30 }],
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("rejects non-producers", async () => {
    vi.mocked(beatRepository.findById).mockResolvedValue(beat());
    vi.mocked(userRepository.findById).mockResolvedValue(owner);
    vi.mocked(userRepository.findByUsername).mockResolvedValue({
      ...collab,
      role: "buyer",
    } as IUser);

    await expect(
      collabService.setSplits("beat_1", "owner_1", "producer", {
        ownerSharePercent: 70,
        collaborators: [{ username: "collabuser", sharePercent: 30 }],
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("sets pending splits and does not activate until accept", async () => {
    vi.mocked(beatRepository.findById).mockResolvedValue(beat());
    vi.mocked(userRepository.findById).mockResolvedValue(owner);
    vi.mocked(userRepository.findByUsername).mockResolvedValue(collab);
    vi.mocked(beatRepository.update).mockResolvedValue(
      beat({
        splitsStatus: "pending",
        ownerSharePercent: 70,
        collaborators: [
          {
            userId: "collab_1",
            sharePercent: 30,
            status: "pending",
            invitedAt: new Date(),
            expiresAt: new Date(Date.now() + 86400000),
          },
        ],
      })
    );

    const result = await collabService.setSplits("beat_1", "owner_1", "producer", {
      ownerSharePercent: 70,
      collaborators: [{ username: "collabuser", sharePercent: 30 }],
    });

    expect(result.splitsStatus).toBe("pending");
    expect(beatRepository.update).toHaveBeenCalledWith(
      "beat_1",
      expect.objectContaining({ splitsStatus: "pending", ownerSharePercent: 70 })
    );
  });

  it("activates when the only collab accepts", async () => {
    const pending = beat({
      splitsStatus: "pending",
      ownerSharePercent: 70,
      collaborators: [
        {
          userId: "collab_1",
          sharePercent: 30,
          status: "pending",
          invitedAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
        },
      ],
    });
    vi.mocked(beatRepository.findById).mockResolvedValue(pending);
    vi.mocked(beatRepository.update).mockImplementation(async (_id, data) => ({
      ...pending,
      ...data,
    }) as IBeat);

    const result = await collabService.respond("beat_1", "collab_1", "accept");
    expect(result.splitsStatus).toBe("active");
  });

  it("keeps pending when only one of two collabs accepts", async () => {
    const pending = beat({
      splitsStatus: "pending",
      ownerSharePercent: 40,
      collaborators: [
        {
          userId: "collab_1",
          sharePercent: 30,
          status: "pending",
          invitedAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
        },
        {
          userId: "collab_2",
          sharePercent: 30,
          status: "pending",
          invitedAt: new Date(),
          expiresAt: new Date(Date.now() + 86400000),
        },
      ],
    });
    vi.mocked(beatRepository.findById).mockResolvedValue(pending);
    vi.mocked(beatRepository.update).mockImplementation(async (_id, data) => ({
      ...pending,
      ...data,
    }) as IBeat);

    const result = await collabService.respond("beat_1", "collab_1", "accept");
    expect(result.splitsStatus).toBe("pending");
  });

  it("resets to pending on percent change via setSplits", async () => {
    vi.mocked(beatRepository.findById).mockResolvedValue(
      beat({ splitsStatus: "active" })
    );
    vi.mocked(userRepository.findById).mockResolvedValue(owner);
    vi.mocked(userRepository.findByUsername).mockResolvedValue(collab);
    vi.mocked(beatRepository.update).mockResolvedValue(
      beat({ splitsStatus: "pending" })
    );

    const result = await collabService.setSplits("beat_1", "owner_1", "producer", {
      ownerSharePercent: 60,
      collaborators: [{ username: "collabuser", sharePercent: 40 }],
    });
    expect(result.splitsStatus).toBe("pending");
  });

  it("expires pending invites lazily", async () => {
    vi.mocked(beatRepository.findById).mockResolvedValue(
      beat({
        splitsStatus: "pending",
        collaborators: [
          {
            userId: "collab_1",
            sharePercent: 30,
            status: "pending",
            invitedAt: new Date(Date.now() - 20 * 86400000),
            expiresAt: new Date(Date.now() - 86400000),
          },
        ],
      })
    );
    vi.mocked(beatRepository.update).mockResolvedValue(beat({ splitsStatus: "inactive" }));

    const result = await collabService.getBeatSplits("beat_1", "owner_1", "producer");
    expect(result.splitsStatus).toBe("inactive");
  });

  it("forbids a non-owner from managing splits", async () => {
    vi.mocked(beatRepository.findById).mockResolvedValue(beat());
    await expect(
      collabService.getBeatSplits("beat_1", "other", "producer")
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("throws when the beat is missing", async () => {
    vi.mocked(beatRepository.findById).mockResolvedValue(null);
    await expect(
      collabService.setSplits("missing", "owner_1", "producer", {
        ownerSharePercent: 70,
        collaborators: [{ username: "collabuser", sharePercent: 30 }],
      })
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it("lists only the viewer's still-open incoming invites", async () => {
    const expiresAt = new Date(Date.now() + 86400000);
    vi.mocked(beatRepository.findByCollaboratorUserId).mockResolvedValue([
      beat({
        splitsStatus: "pending",
        ownerSharePercent: 50,
        collaborators: [
          {
            userId: "collab_1",
            sharePercent: 30,
            status: "accepted",
            invitedAt: new Date(),
            expiresAt,
          },
          {
            userId: "collab_2",
            sharePercent: 20,
            status: "pending",
            invitedAt: new Date(),
            expiresAt,
          },
        ],
      }),
      beat({
        _id: "beat_2",
        splitsStatus: "pending",
        collaborators: [
          {
            userId: "collab_1",
            sharePercent: 40,
            status: "pending",
            invitedAt: new Date(),
            expiresAt,
          },
        ],
      }),
    ]);
    vi.mocked(beatRepository.findByProducerId).mockResolvedValue([]);

    const result = await collabService.listForUser("collab_1");

    expect(result.viewerUserId).toBe("collab_1");
    expect(result.incoming).toHaveLength(1);
    expect(result.incoming[0].beatId).toBe("beat_2");
  });

  it("rejects a second response", async () => {
    vi.mocked(beatRepository.findById).mockResolvedValue(
      beat({
        splitsStatus: "active",
        collaborators: [
          {
            userId: "collab_1",
            sharePercent: 30,
            status: "accepted",
            invitedAt: new Date(),
            expiresAt: new Date(Date.now() + 86400000),
          },
        ],
      })
    );

    await expect(collabService.respond("beat_1", "collab_1", "accept")).rejects.toBeInstanceOf(
      ConflictError
    );
  });
});
