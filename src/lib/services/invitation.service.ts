import crypto from "crypto";
import { invitationRepository } from "@/lib/repositories/invitation.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { emailService } from "@/lib/services/email.service";
import { producerService } from "@/lib/services/producer.service";
import { withTransaction } from "@/lib/db";
import { AppError, ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import {
  FOUNDING_FEE_OVERRIDE,
  addFoundingPeriod,
  addInviteExpiry,
} from "@/lib/founding";
import type { IInvitation, IUser } from "@/types";

function emailsMatch(a: string, b: string): boolean {
  return a.toLowerCase().trim() === b.toLowerCase().trim();
}

function throwIfExpired(invitation: IInvitation): void {
  if (
    invitation.status === "expired" ||
    new Date(invitation.expiresAt) < new Date()
  ) {
    throw new AppError("Invitation has expired", 400, "INVITE_EXPIRED");
  }
}

export const invitationService = {
  async list(page = 1, limit = 50): Promise<{ data: IInvitation[]; total: number }> {
    return invitationRepository.findAll(page, limit);
  },

  async send(
    email: string,
    name: string,
    adminId: string
  ): Promise<IInvitation> {
    if (!email || !name) {
      throw new ValidationError("Email and name are required");
    }

    const existing = await invitationRepository.findByEmail(email);
    if (existing && existing.status === "sent" && new Date(existing.expiresAt) > new Date()) {
      throw new ConflictError("An active invitation already exists for this email");
    }

    const token = crypto.randomBytes(32).toString("hex");

    const invitation = await invitationRepository.create({
      email: email.toLowerCase().trim(),
      name: name.trim(),
      token,
      status: "sent",
      producerTier: "founding",
      platformFeeOverride: FOUNDING_FEE_OVERRIDE,
      expiresAt: addInviteExpiry(),
      invitedBy: adminId,
    });

    await emailService.sendFoundingInvitation({ to: email, name, token });

    audit({
      action: "admin.action",
      userId: adminId,
      resourceType: "invitation",
      resourceId: invitation._id.toString(),
      metadata: { email, action: "founding_invitation_sent" },
    });

    return invitation;
  },

  async validate(
    token: string,
    userId?: string
  ): Promise<{
    valid: boolean;
    name?: string;
    email?: string;
    producerTier?: string;
    platformFeeOverride?: number;
    alreadyAccepted?: boolean;
  }> {
    if (!token) throw new ValidationError("Token is required");

    const invitation = await invitationRepository.findByToken(token);
    if (!invitation) throw new NotFoundError("Invalid invitation");

    if (invitation.status === "accepted") {
      if (userId) {
        const user = await userRepository.findById(userId);
        if (user && emailsMatch(user.email, invitation.email)) {
          return {
            valid: true,
            alreadyAccepted: true,
            name: invitation.name,
            email: invitation.email,
            producerTier: invitation.producerTier,
            platformFeeOverride: invitation.platformFeeOverride,
          };
        }
      }
      throw new ConflictError("Invitation already accepted");
    }

    throwIfExpired(invitation);

    return {
      valid: true,
      name: invitation.name,
      email: invitation.email,
      producerTier: invitation.producerTier,
      platformFeeOverride: invitation.platformFeeOverride,
    };
  },

  async accept(
    token: string,
    userId: string
  ): Promise<{
    producerTier: string;
    platformFeeOverride: number;
    producerTierExpiresAt: string;
  }> {
    if (!token) throw new ValidationError("Token is required");

    const invitation = await invitationRepository.findByToken(token);
    if (!invitation) throw new NotFoundError("Invalid invitation");

    const user = await userRepository.findById(userId);
    if (!user) throw new NotFoundError("User");

    if (!emailsMatch(user.email, invitation.email)) {
      throw new ValidationError("This invitation was sent to a different email");
    }

    if (invitation.status === "accepted") {
      if (user.producerTier === invitation.producerTier) {
        return {
          producerTier: invitation.producerTier,
          platformFeeOverride:
            typeof user.platformFeeOverride === "number"
              ? user.platformFeeOverride
              : invitation.platformFeeOverride,
          producerTierExpiresAt: user.producerTierExpiresAt
            ? new Date(user.producerTierExpiresAt).toISOString()
            : new Date().toISOString(),
        };
      }
      throw new ConflictError("Invitation already accepted");
    }

    throwIfExpired(invitation);

    const tierExpiresAt = addFoundingPeriod();
    const tierUpdate: Partial<IUser> = {
      producerTier: invitation.producerTier,
      platformFeeOverride: invitation.platformFeeOverride,
      producerTierExpiresAt: tierExpiresAt,
    };

    await withTransaction(async (session) => {
      await producerService.ensureProducerAccount(userId, { session });
      await userRepository.update(userId, tierUpdate, { session });
      await invitationRepository.markAccepted(token, { session });
    });

    audit({
      action: "admin.action",
      userId,
      resourceType: "invitation",
      resourceId: invitation._id.toString(),
      metadata: {
        action: "invitation_accepted",
        producerTier: invitation.producerTier,
        platformFeeOverride: invitation.platformFeeOverride,
      },
    });

    return {
      producerTier: invitation.producerTier,
      platformFeeOverride: invitation.platformFeeOverride,
      producerTierExpiresAt: tierExpiresAt.toISOString(),
    };
  },
};
