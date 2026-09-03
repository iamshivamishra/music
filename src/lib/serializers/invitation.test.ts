import { describe, expect, it } from "vitest";
import { toAdminInvitation } from "./invitation";
import type { IInvitation } from "@/types";

describe("toAdminInvitation", () => {
  it("serializes ids and dates for the admin table", () => {
    const invitation: IInvitation = {
      _id: "inv1",
      email: "producer@example.com",
      name: "Riya",
      token: "tok",
      status: "sent",
      producerTier: "founding",
      platformFeeOverride: 0,
      expiresAt: new Date("2026-09-10T00:00:00.000Z"),
      invitedBy: "admin1",
      createdAt: new Date("2026-09-03T00:00:00.000Z"),
      updatedAt: new Date("2026-09-03T00:00:00.000Z"),
    };

    expect(toAdminInvitation(invitation)).toMatchObject({
      _id: "inv1",
      email: "producer@example.com",
      name: "Riya",
      status: "sent",
      expiresAt: "2026-09-10T00:00:00.000Z",
      acceptedAt: null,
      createdAt: "2026-09-03T00:00:00.000Z",
    });
  });
});
