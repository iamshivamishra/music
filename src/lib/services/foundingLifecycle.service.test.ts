import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IInvitation, IUser } from "@/types";

vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/repositories/invitation.repository", () => ({
  invitationRepository: {
    markExpiredSent: vi.fn(),
    findDueFollowUps: vi.fn(),
    markFollowUpSent: vi.fn(),
  },
}));
vi.mock("@/lib/repositories/user.repository", () => ({
  userRepository: {
    findByEmails: vi.fn(),
    findExpiredFoundingProducers: vi.fn(),
  },
}));
vi.mock("@/lib/repositories/beat.repository", () => ({
  beatRepository: {
    countByProducerIds: vi.fn(),
  },
}));
vi.mock("@/lib/services/email.service", () => ({
  emailService: {
    sendFoundingUploadNudge: vi.fn(),
    sendFoundingExpired: vi.fn(),
  },
}));
vi.mock("@/lib/services/producer.service", () => ({
  producerService: {
    updateTier: vi.fn(),
  },
}));

import { foundingLifecycleService } from "./foundingLifecycle.service";
import { invitationRepository } from "@/lib/repositories/invitation.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { emailService } from "@/lib/services/email.service";
import { producerService } from "@/lib/services/producer.service";

const mockedInvites = vi.mocked(invitationRepository);
const mockedUsers = vi.mocked(userRepository);
const mockedBeats = vi.mocked(beatRepository);
const mockedEmail = vi.mocked(emailService);
const mockedProducer = vi.mocked(producerService);

function makeInvite(overrides: Partial<IInvitation> = {}): IInvitation {
  return {
    _id: "inv1",
    email: "producer@example.com",
    name: "Riya",
    token: "tok",
    status: "accepted",
    producerTier: "founding",
    platformFeeOverride: 0,
    expiresAt: new Date(),
    invitedBy: "admin1",
    acceptedAt: new Date(Date.now() - 4 * 86_400_000),
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
    role: "producer",
    producerTier: "founding",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("foundingLifecycleService.runDailyJobs", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockedInvites.markExpiredSent.mockResolvedValue(0);
    mockedInvites.findDueFollowUps.mockResolvedValue([]);
    mockedInvites.markFollowUpSent.mockResolvedValue(undefined);
    mockedUsers.findByEmails.mockResolvedValue([]);
    mockedUsers.findExpiredFoundingProducers.mockResolvedValue([]);
    mockedBeats.countByProducerIds.mockResolvedValue(new Map());
    mockedEmail.sendFoundingUploadNudge.mockResolvedValue(undefined);
    mockedEmail.sendFoundingExpired.mockResolvedValue(undefined);
    mockedProducer.updateTier.mockResolvedValue(makeUser({ producerTier: "standard" }));
  });

  it("marks expired invitations", async () => {
    mockedInvites.markExpiredSent.mockResolvedValue(3);
    const result = await foundingLifecycleService.runDailyJobs();
    expect(result.expiredInvitations).toBe(3);
  });

  it("sends a day-3 nudge once when the producer has zero published beats", async () => {
    mockedInvites.findDueFollowUps.mockImplementation(async (day) =>
      day === 3 ? [makeInvite()] : []
    );
    mockedUsers.findByEmails.mockResolvedValue([makeUser()]);
    mockedBeats.countByProducerIds.mockResolvedValue(new Map([["user1", 0]]));

    const result = await foundingLifecycleService.runDailyJobs();

    expect(result.day3Nudges).toBe(1);
    expect(mockedEmail.sendFoundingUploadNudge).toHaveBeenCalledWith({
      to: "producer@example.com",
      name: "Riya",
      day: 3,
    });
    expect(mockedInvites.markFollowUpSent).toHaveBeenCalledWith("inv1", 3);
  });

  it("skips the nudge when the producer already published beats", async () => {
    mockedInvites.findDueFollowUps.mockImplementation(async (day) =>
      day === 3 ? [makeInvite()] : []
    );
    mockedUsers.findByEmails.mockResolvedValue([makeUser()]);
    mockedBeats.countByProducerIds.mockResolvedValue(new Map([["user1", 2]]));

    const result = await foundingLifecycleService.runDailyJobs();

    expect(result.day3Nudges).toBe(0);
    expect(mockedEmail.sendFoundingUploadNudge).not.toHaveBeenCalled();
    expect(mockedInvites.markFollowUpSent).toHaveBeenCalled();
  });

  it("downgrades expired founding producers and emails them", async () => {
    mockedUsers.findExpiredFoundingProducers.mockResolvedValue([makeUser()]);

    const result = await foundingLifecycleService.runDailyJobs();

    expect(result.expiredTiers).toBe(1);
    expect(mockedProducer.updateTier).toHaveBeenCalledWith(
      "user1",
      { producerTier: "standard" },
      "system"
    );
    expect(mockedEmail.sendFoundingExpired).toHaveBeenCalled();
  });

  it("is a no-op for founding expiry when nobody is expired", async () => {
    const result = await foundingLifecycleService.runDailyJobs();
    expect(result.expiredTiers).toBe(0);
    expect(mockedEmail.sendFoundingExpired).not.toHaveBeenCalled();
  });
});
