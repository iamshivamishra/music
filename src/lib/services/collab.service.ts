import { beatRepository } from "@/lib/repositories/beat.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { emailService } from "@/lib/services/email.service";
import { getAppUrl } from "@/lib/app-url";
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { logger } from "@/lib/logger";
import { withFeatureFlag } from "@/lib/assert-feature";
import {
  collaboratorUserIds,
  toBeatSplitsDto,
  toCollabUserMap,
  type BeatSplitsDto,
} from "@/lib/serializers/collab";
import type { IBeat, IBeatCollaborator, IUser, SplitsStatus } from "@/types";
import type { SetBeatSplitsInput } from "@/lib/validators/collab";

export const COLLAB_INVITE_EXPIRY_DAYS = 14;

function toId(value: { toString(): string } | string): string {
  return typeof value === "string" ? value : value.toString();
}

function isProducerRole(role: string | undefined): boolean {
  return role === "producer" || role === "admin";
}

function inviteExpiryDate(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + COLLAB_INVITE_EXPIRY_DAYS);
  return expiresAt;
}

function hasExpiredPending(beat: IBeat, now = new Date()): boolean {
  return (beat.collaborators ?? []).some(
    (collaborator) =>
      collaborator.status === "pending" && new Date(collaborator.expiresAt) < now
  );
}

async function persistExpired(beat: IBeat): Promise<IBeat> {
  if (beat.splitsStatus !== "pending" || !hasExpiredPending(beat)) return beat;
  const updated = await beatRepository.update(toId(beat._id), { splitsStatus: "inactive" });
  return updated ?? { ...beat, splitsStatus: "inactive" };
}

function assertCanManage(beat: IBeat, userId: string, userRole: string): void {
  if (beat.exclusiveBuyerId) {
    throw new ConflictError("Cannot change collaborators on a beat that has been exclusively sold");
  }
  if (toId(beat.producerId) !== userId && userRole !== "admin") {
    throw new ForbiddenError("You can only manage collaborators on your own beats");
  }
}

async function toSplitsDto(beat: IBeat): Promise<BeatSplitsDto> {
  const users = await userRepository.findByIds(
    (beat.collaborators ?? []).map((collaborator) => toId(collaborator.userId))
  );
  return toBeatSplitsDto(beat, toCollabUserMap(users));
}

async function toSplitsDtoList(beats: IBeat[]): Promise<BeatSplitsDto[]> {
  const users = await userRepository.findByIds(collaboratorUserIds(beats));
  const userMap = toCollabUserMap(users);
  return beats.map((beat) => toBeatSplitsDto(beat, userMap));
}

async function notifyInvitees(
  beat: IBeat,
  owner: IUser,
  invitees: IUser[]
): Promise<void> {
  const collabUrl = `${getAppUrl()}/studio/collabs`;
  const ownerName = owner.displayName || owner.name;
  await Promise.allSettled(
    invitees.map((invitee) =>
      emailService.sendCollabInvite({
        to: invitee.email,
        name: invitee.displayName || invitee.name,
        ownerName,
        beatTitle: beat.title,
        sharePercent:
          beat.collaborators?.find((c) => toId(c.userId) === toId(invitee._id))?.sharePercent ?? 0,
        collabUrl,
      })
    )
  );
}

export const collabService = withFeatureFlag("collabSplits", {
  async getBeatSplits(beatId: string, userId: string, userRole: string): Promise<BeatSplitsDto> {
    const beat = await beatRepository.findById(beatId);
    if (!beat) throw new NotFoundError("Beat");
    assertCanManage(beat, userId, userRole);
    const current = await persistExpired(beat);
    return toSplitsDto(current);
  },

  async setSplits(
    beatId: string,
    userId: string,
    userRole: string,
    input: SetBeatSplitsInput
  ): Promise<BeatSplitsDto> {
    const beat = await beatRepository.findById(beatId);
    if (!beat) throw new NotFoundError("Beat");
    assertCanManage(beat, userId, userRole);

    const owner = await userRepository.findById(userId);
    if (!owner) throw new NotFoundError("User");

    const lookedUp = await Promise.all(
      input.collaborators.map(async (member) => ({
        member,
        user: await userRepository.findByUsername(member.username),
      }))
    );

    const resolved: { user: IUser; sharePercent: number }[] = [];
    for (const { member, user } of lookedUp) {
      if (!user) throw new NotFoundError(`Producer @${member.username}`);
      if (!isProducerRole(user.role)) {
        throw new ValidationError("Collaborators must be producer accounts", {
          username: [`@${member.username} is not a producer`],
        });
      }
      if (toId(user._id) === toId(beat.producerId)) {
        throw new ValidationError("You cannot invite yourself as a collaborator");
      }
      resolved.push({ user, sharePercent: member.sharePercent });
    }

    const uniqueIds = new Set(resolved.map((entry) => toId(entry.user._id)));
    if (uniqueIds.size !== resolved.length) {
      throw new ValidationError("Collaborators must be unique");
    }

    const expiresAt = inviteExpiryDate();
    const collaborators: IBeatCollaborator[] = resolved.map(({ user, sharePercent }) => ({
      userId: user._id,
      sharePercent,
      status: "pending",
      invitedAt: new Date(),
      expiresAt,
    }));

    const updated = await beatRepository.update(beatId, {
      collaborators,
      ownerSharePercent: input.ownerSharePercent,
      splitsStatus: "pending",
    });
    if (!updated) throw new NotFoundError("Beat");

    audit({
      action: "beat.collab_invited",
      userId,
      resourceType: "beat",
      resourceId: beatId,
      metadata: {
        ownerSharePercent: input.ownerSharePercent,
        collaborators: resolved.map((entry) => ({
          userId: toId(entry.user._id),
          sharePercent: entry.sharePercent,
        })),
      },
    });

    notifyInvitees(updated, owner, resolved.map((entry) => entry.user)).catch((error) => {
      logger.warn("Failed to send collab invite emails", {
        beatId,
        error: error instanceof Error ? error.message : String(error),
      });
    });

    return toSplitsDto(updated);
  },

  async updateSettings(
    beatId: string,
    userId: string,
    userRole: string,
    input: { showCollabCredits?: boolean; cancel?: true }
  ): Promise<BeatSplitsDto> {
    const beat = await beatRepository.findById(beatId);
    if (!beat) throw new NotFoundError("Beat");
    assertCanManage(beat, userId, userRole);

    if (input.cancel) {
      const updated = await beatRepository.update(beatId, {
        collaborators: [],
        ownerSharePercent: 100,
        splitsStatus: "inactive",
      });
      if (!updated) throw new NotFoundError("Beat");
      audit({
        action: "beat.collab_cancelled",
        userId,
        resourceType: "beat",
        resourceId: beatId,
      });
      return toSplitsDto(updated);
    }

    if (typeof input.showCollabCredits === "boolean") {
      const updated = await beatRepository.update(beatId, {
        showCollabCredits: input.showCollabCredits,
      });
      if (!updated) throw new NotFoundError("Beat");
      return toSplitsDto(updated);
    }

    return toSplitsDto(beat);
  },

  async listForUser(userId: string): Promise<{
    incoming: BeatSplitsDto[];
    outgoing: BeatSplitsDto[];
    viewerUserId: string;
  }> {
    const [asCollab, asOwner] = await Promise.all([
      beatRepository.findByCollaboratorUserId(userId),
      beatRepository.findByProducerId(userId, true),
    ]);

    const now = new Date();
    const [incomingResolved, outgoingResolved] = await Promise.all([
      Promise.all(asCollab.map(persistExpired)),
      Promise.all(
        asOwner
          .filter((item) => (item.collaborators?.length ?? 0) > 0)
          .map(persistExpired)
      ),
    ]);

    const incomingBeats = incomingResolved.filter((beat) => {
      const mine = beat.collaborators?.find((entry) => toId(entry.userId) === userId);
      return (
        mine?.status === "pending" &&
        beat.splitsStatus === "pending" &&
        new Date(mine.expiresAt) >= now
      );
    });

    const [incoming, outgoing] = await Promise.all([
      toSplitsDtoList(incomingBeats),
      toSplitsDtoList(outgoingResolved),
    ]);

    return { incoming, outgoing, viewerUserId: userId };
  },

  async countPendingInvites(userId: string): Promise<number> {
    return beatRepository.countPendingInvitesForUser(userId);
  },

  async respond(
    beatId: string,
    userId: string,
    action: "accept" | "decline"
  ): Promise<BeatSplitsDto> {
    const beat = await beatRepository.findById(beatId);
    if (!beat) throw new NotFoundError("Beat");
    const current = await persistExpired(beat);

    const collaborator = current.collaborators?.find((entry) => toId(entry.userId) === userId);
    if (!collaborator) {
      throw new ForbiddenError("You were not invited to this beat");
    }
    if (collaborator.status !== "pending") {
      throw new ConflictError("You have already responded to this invite");
    }
    if (current.splitsStatus === "inactive" || new Date(collaborator.expiresAt) < new Date()) {
      throw new ValidationError("This invitation has expired");
    }

    const now = new Date();
    const nextCollaborators = (current.collaborators ?? []).map((entry) =>
      toId(entry.userId) === userId
        ? { ...entry, status: action === "accept" ? "accepted" as const : "declined" as const, respondedAt: now }
        : entry
    );

    let splitsStatus: SplitsStatus = "pending";
    if (action === "decline") {
      splitsStatus = "inactive";
    } else {
      const nonOwner = nextCollaborators.filter((entry) => toId(entry.userId) !== toId(current.producerId));
      const allAccepted = nonOwner.length > 0 && nonOwner.every((entry) => entry.status === "accepted");
      splitsStatus = allAccepted ? "active" : "pending";
    }

    const updated = await beatRepository.update(beatId, {
      collaborators: nextCollaborators,
      splitsStatus,
    });
    if (!updated) throw new NotFoundError("Beat");

    audit({
      action: action === "accept" ? "beat.collab_accepted" : "beat.collab_declined",
      userId,
      resourceType: "beat",
      resourceId: beatId,
    });

    return toSplitsDto(updated);
  },
});
