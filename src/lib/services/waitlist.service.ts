import { waitlistRepository } from "@/lib/repositories/waitlist.repository";
import { invitationService } from "@/lib/services/invitation.service";
import { ConflictError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import type { JoinWaitlistInput } from "@/lib/validators/waitlist";
import type { IWaitlist, PaginatedResult } from "@/types";

export const waitlistService = {
  async join(input: JoinWaitlistInput): Promise<IWaitlist> {
    const existing = await waitlistRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError("You're already on the waitlist!");
    }

    const entry = await waitlistRepository.create(input);

    logger.info("Waitlist entry created", {
      email: entry.email,
      id: entry._id,
    });
    audit({
      action: "waitlist.join",
      resourceType: "waitlist",
      resourceId: entry._id.toString(),
      metadata: { email: entry.email },
    });

    return entry;
  },

  async listPending(
    page: number,
    limit: number
  ): Promise<PaginatedResult<IWaitlist>> {
    return waitlistRepository.findPending(page, limit);
  },

  async invite(id: string, adminId: string): Promise<IWaitlist | null> {
    const entry = await waitlistRepository.findById(id);
    if (!entry) return null;
    if (entry.status !== "pending") {
      throw new ConflictError("This waitlist entry has already been invited");
    }

    try {
      await invitationService.send(entry.email, entry.name, adminId);
    } catch (error) {
      if (!(error instanceof ConflictError)) throw error;
    }

    const invited = await waitlistRepository.markInvited(id);

    if (invited) {
      logger.info("Waitlist entry invited", {
        email: invited.email,
        id: invited._id,
      });
      audit({
        action: "waitlist.invite",
        userId: adminId,
        resourceType: "waitlist",
        resourceId: invited._id.toString(),
        metadata: { email: invited.email },
      });
    }

    return invited;
  },
};
