import type { IBeat, IBeatCollaborator, IUser, SplitsStatus } from "@/types";

function toId(value: { toString(): string } | string): string {
  return typeof value === "string" ? value : value.toString();
}

export interface HydratedCollaborator {
  userId: string;
  username?: string;
  displayName: string;
  sharePercent: number;
  status: IBeatCollaborator["status"];
  invitedAt: Date;
  respondedAt?: Date;
  expiresAt: Date;
}

export interface BeatSplitsDto {
  beatId: string;
  beatTitle: string;
  ownerSharePercent: number;
  splitsStatus: SplitsStatus;
  showCollabCredits: boolean;
  collaborators: HydratedCollaborator[];
}

export type CollabUser = Pick<IUser, "_id" | "username" | "displayName" | "name">;

export function toCollabUserMap(users: CollabUser[]): Map<string, CollabUser> {
  return new Map(users.map((user) => [toId(user._id), user]));
}

export function collaboratorUserIds(beats: IBeat[]): string[] {
  const ids = new Set<string>();
  for (const beat of beats) {
    for (const collaborator of beat.collaborators ?? []) {
      ids.add(toId(collaborator.userId));
    }
  }
  return [...ids];
}

export function toBeatSplitsDto(
  beat: IBeat,
  userMap: Map<string, CollabUser>
): BeatSplitsDto {
  return {
    beatId: toId(beat._id),
    beatTitle: beat.title,
    ownerSharePercent: beat.ownerSharePercent ?? 100,
    splitsStatus: beat.splitsStatus ?? "inactive",
    showCollabCredits: beat.showCollabCredits !== false,
    collaborators: (beat.collaborators ?? []).map((collaborator) => {
      const user = userMap.get(toId(collaborator.userId));
      return {
        userId: toId(collaborator.userId),
        username: user?.username,
        displayName: user?.displayName || user?.name || "Producer",
        sharePercent: collaborator.sharePercent,
        status: collaborator.status,
        invitedAt: collaborator.invitedAt,
        respondedAt: collaborator.respondedAt,
        expiresAt: collaborator.expiresAt,
      };
    }),
  };
}
