import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConflictError } from "@/lib/errors";
import type { IWaitlist } from "@/types";

vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));
vi.mock("@/lib/repositories/waitlist.repository", () => ({
  waitlistRepository: {
    findById: vi.fn(),
    markInvited: vi.fn(),
    findByEmail: vi.fn(),
    create: vi.fn(),
    findPending: vi.fn(),
  },
}));
vi.mock("@/lib/services/invitation.service", () => ({
  invitationService: {
    send: vi.fn(),
  },
}));

import { waitlistService } from "./waitlist.service";
import { waitlistRepository } from "@/lib/repositories/waitlist.repository";
import { invitationService } from "@/lib/services/invitation.service";

const mockedWaitlist = vi.mocked(waitlistRepository);
const mockedInvites = vi.mocked(invitationService);

function makeEntry(overrides: Partial<IWaitlist> = {}): IWaitlist {
  return {
    _id: "wl1",
    email: "producer@example.com",
    name: "Riya",
    role: "producer",
    status: "pending",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("waitlistService.invite", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends a founding invitation and marks the entry invited", async () => {
    mockedWaitlist.findById.mockResolvedValue(makeEntry());
    mockedInvites.send.mockResolvedValue({} as never);
    mockedWaitlist.markInvited.mockResolvedValue(
      makeEntry({ status: "invited" })
    );

    const result = await waitlistService.invite("wl1", "admin1");

    expect(mockedInvites.send).toHaveBeenCalledWith(
      "producer@example.com",
      "Riya",
      "admin1"
    );
    expect(mockedWaitlist.markInvited).toHaveBeenCalledWith("wl1");
    expect(result?.status).toBe("invited");
  });

  it("still marks invited when an active invitation already exists", async () => {
    mockedWaitlist.findById.mockResolvedValue(makeEntry());
    mockedInvites.send.mockRejectedValue(
      new ConflictError("An active invitation already exists for this email")
    );
    mockedWaitlist.markInvited.mockResolvedValue(
      makeEntry({ status: "invited" })
    );

    const result = await waitlistService.invite("wl1", "admin1");

    expect(mockedWaitlist.markInvited).toHaveBeenCalledWith("wl1");
    expect(result?.status).toBe("invited");
  });
});
