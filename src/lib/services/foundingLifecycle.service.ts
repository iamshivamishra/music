import { invitationRepository } from "@/lib/repositories/invitation.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { emailService } from "@/lib/services/email.service";
import { producerService } from "@/lib/services/producer.service";
import { getDefaultPlatformFeePercent } from "@/lib/fees";
import { SYSTEM_ACTOR_ID } from "@/lib/founding";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";

const DAY_MS = 24 * 60 * 60 * 1000;

export interface FoundingLifecycleResult {
  expiredInvitations: number;
  day3Nudges: number;
  day7Nudges: number;
  expiredTiers: number;
}

async function sendUploadNudges(day: 3 | 7): Promise<number> {
  const acceptedBefore = new Date(Date.now() - day * DAY_MS);
  const invitations = await invitationRepository.findDueFollowUps(day, acceptedBefore);
  if (invitations.length === 0) return 0;

  const emails = [...new Set(invitations.map((inv) => inv.email.toLowerCase()))];
  const users = await userRepository.findByEmails(emails);
  const userByEmail = new Map(
    users.map((user) => [user.email.toLowerCase(), user])
  );

  const producerIds = [...userByEmail.values()].map((user) => user._id.toString());
  const beatCounts = await beatRepository.countByProducerIds(producerIds);

  let sent = 0;
  for (const invitation of invitations) {
    const user = userByEmail.get(invitation.email.toLowerCase());
    if (!user) {
      await invitationRepository.markFollowUpSent(invitation._id.toString(), day);
      continue;
    }

    const published = beatCounts.get(user._id.toString()) ?? 0;
    if (published > 0) {
      await invitationRepository.markFollowUpSent(invitation._id.toString(), day);
      continue;
    }

    await emailService.sendFoundingUploadNudge({
      to: user.email,
      name: invitation.name || user.name,
      day,
    });
    await invitationRepository.markFollowUpSent(invitation._id.toString(), day);
    sent += 1;
  }

  return sent;
}

export const foundingLifecycleService = {
  async runDailyJobs(): Promise<FoundingLifecycleResult> {
    const expiredInvitations = await invitationRepository.markExpiredSent();

    const day3Nudges = await sendUploadNudges(3);
    const day7Nudges = await sendUploadNudges(7);

    const expiredProducers = await userRepository.findExpiredFoundingProducers();
    const defaultFee = getDefaultPlatformFeePercent();
    let expiredTiers = 0;

    for (const producer of expiredProducers) {
      const id = producer._id.toString();
      try {
        await producerService.updateTier(
          id,
          { producerTier: "standard" },
          SYSTEM_ACTOR_ID
        );
      } catch (error) {
        logger.warn("Failed to expire founding tier", {
          userId: id,
          error: error instanceof Error ? error.message : String(error),
        });
        continue;
      }

      await emailService.sendFoundingExpired({
        to: producer.email,
        name: producer.name,
        feePercent: defaultFee,
      });

      audit({
        action: "admin.action",
        userId: SYSTEM_ACTOR_ID,
        resourceType: "user",
        resourceId: id,
        metadata: { action: "founding_tier_expired" },
      });
      expiredTiers += 1;
    }

    logger.info("Founding lifecycle jobs completed", {
      expiredInvitations,
      day3Nudges,
      day7Nudges,
      expiredTiers,
    });

    return { expiredInvitations, day3Nudges, day7Nudges, expiredTiers };
  },
};
