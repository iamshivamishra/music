import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppError, ConflictError, ValidationError } from "@/lib/errors";
import type { IInvitation, IUser } from "@/types";

vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/db", () => ({
  withTransaction: vi.fn(async (operation: (session: unknown) => Promise<unknown>) =>
    operation({})
  ),
}));
vi.mock("@/lib/repositories/invitation.repository", () => ({
  invitationRepository: {
    findByEmail: vi.fn(),
    findByToken: vi.fn(),
    create: vi.fn(),
    markAccepted: vi.fn(),
    findAll: vi.fn(),
  },
}));
vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: {
    findById: vi.fn(),
    update: vi.fn(),
    usernameExists: vi.fn(),
  },
}));
vi.mock("@/lib/services/email.service", () => ({
  emailService: {
    sendFoundingInvitation: vi.fn(),
  },
}));
vi.mock("@/lib/services/producer.service", () => ({
  producerService: {
    ensureProducerAccount: vi.fn(),
    updateTier: vi.fn(),
  },
}));

import { invitationService } from "./invitation.service";
import { invitationRepository } from "@/lib/repositories/invitation.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { emailService } from "@/lib/services/email.service";
import { producerService } from "@/lib/services/producer.service";

const mockedInvites = vi.mocked(invitationRepository);
const mockedUsers = vi.mocked(userRepository);
const mockedEmail = vi.mocked(emailService);
const mockedProducer = vi.mocked(producerService);

function makeInvitation(overrides: Partial<IInvitation> = {}): IInvitation {
  return {
    _id: "inv1",
    email: "producer@example.com",
    name: "Riya",
    token: "token-abc",
    status: "sent",
    producerTier: "founding",
    platformFeeOverride: 0,
    expiresAt: new Date(Date.now() + 86_400_000),
    invitedBy: "admin1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function makeUser(overrides: Partial<IUser> = {}): IUser {
  return {
    _id: "user1",
    name: "Riya",
    email: "producer@example.com",
    role: "buyer",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("invitationService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends a founding invitation", async () => {
    mockedInvites.findByEmail.mockResolvedValue(null);
    mockedInvites.create.mockResolvedValue(makeInvitation());
    mockedEmail.sendFoundingInvitation.mockResolvedValue(undefined);

    const invitation = await invitationService.send(
      "producer@example.com",
      "Riya",
      "admin1"
    );

    expect(invitation.producerTier).toBe("founding");
    expect(mockedEmail.sendFoundingInvitation).toHaveBeenCalledWith({
      to: "producer@example.com",
      name: "Riya",
      token: expect.any(String),
    });
  });

  it("rejects an expired token", async () => {
    mockedInvites.findByToken.mockResolvedValue(
      makeInvitation({ expiresAt: new Date(Date.now() - 1000) })
    );

    await expect(invitationService.validate("token-abc")).rejects.toMatchObject({
      code: "INVITE_EXPIRED",
    });
  });

  it("rejects accept when emails do not match", async () => {
    mockedInvites.findByToken.mockResolvedValue(makeInvitation());
    mockedUsers.findById.mockResolvedValue(
      makeUser({ email: "other@example.com" })
    );

    await expect(
      invitationService.accept("token-abc", "user1")
    ).rejects.toBeInstanceOf(ValidationError);
  });

  it("treats an already-accepted invite as valid for the matching user", async () => {
    mockedInvites.findByToken.mockResolvedValue(
      makeInvitation({ status: "accepted" })
    );
    mockedUsers.findById.mockResolvedValue(
      makeUser({ role: "producer", producerTier: "founding" })
    );

    const result = await invitationService.validate("token-abc", "user1");
    expect(result.valid).toBe(true);
    expect(result.alreadyAccepted).toBe(true);
  });

  it("applies founding tier when emails match", async () => {
    mockedInvites.findByToken.mockResolvedValue(makeInvitation());
    mockedUsers.findById.mockResolvedValue(makeUser());
    mockedProducer.ensureProducerAccount.mockResolvedValue(
      makeUser({ role: "producer", username: "riya" })
    );
    mockedUsers.update.mockResolvedValue(makeUser({ role: "producer" }));
    mockedInvites.markAccepted.mockResolvedValue(
      makeInvitation({ status: "accepted" })
    );

    const result = await invitationService.accept("token-abc", "user1");

    expect(result.producerTier).toBe("founding");
    expect(result.platformFeeOverride).toBe(0);
    expect(mockedProducer.ensureProducerAccount).toHaveBeenCalledWith("user1", {
      session: {},
    });
    expect(mockedUsers.update).toHaveBeenCalled();
    expect(mockedInvites.markAccepted).toHaveBeenCalledWith("token-abc", {
      session: {},
    });
  });

  it("is idempotent when the same user already accepted", async () => {
    mockedInvites.findByToken.mockResolvedValue(
      makeInvitation({ status: "accepted" })
    );
    mockedUsers.findById.mockResolvedValue(
      makeUser({
        role: "producer",
        producerTier: "founding",
        platformFeeOverride: 0,
        producerTierExpiresAt: new Date("2027-01-01"),
      })
    );

    const result = await invitationService.accept("token-abc", "user1");
    expect(result.producerTier).toBe("founding");
    expect(mockedUsers.update).not.toHaveBeenCalled();
  });

  it("rejects a second user accepting an already-used invite", async () => {
    mockedInvites.findByToken.mockResolvedValue(
      makeInvitation({ status: "accepted" })
    );
    mockedUsers.findById.mockResolvedValue(
      makeUser({ email: "producer@example.com", producerTier: "standard" })
    );

    await expect(
      invitationService.accept("token-abc", "user1")
    ).rejects.toBeInstanceOf(ConflictError);
  });

  it("throws AppError with INVITE_EXPIRED on accept", async () => {
    mockedInvites.findByToken.mockResolvedValue(
      makeInvitation({ expiresAt: new Date(Date.now() - 1000) })
    );
    mockedUsers.findById.mockResolvedValue(makeUser());

    await expect(invitationService.accept("token-abc", "user1")).rejects.toBeInstanceOf(
      AppError
    );
  });
});
