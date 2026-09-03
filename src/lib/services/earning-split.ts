import type { IBeat } from "@/types";

export interface SplitShare {
  producerId: string;
  percent: number;
  isOwner: boolean;
}

export interface SplitAmountRow {
  producerId: string;
  grossAmount: number;
  sharePercent: number;
  isOwner: boolean;
}

function toId(value: { toString(): string } | string): string {
  return typeof value === "string" ? value : value.toString();
}

export function resolveActiveShares(
  beat: Pick<IBeat, "producerId" | "splitsStatus" | "ownerSharePercent" | "collaborators">
): SplitShare[] {
  const ownerId = toId(beat.producerId);
  const accepted =
    beat.collaborators?.filter((collaborator) => collaborator.status === "accepted") ?? [];

  if (beat.splitsStatus !== "active" || accepted.length === 0) {
    return [{ producerId: ownerId, percent: 100, isOwner: true }];
  }

  const collabPercent = accepted.reduce((sum, collaborator) => sum + collaborator.sharePercent, 0);
  const ownerPercent = beat.ownerSharePercent ?? Math.max(1, 100 - collabPercent);

  return [
    { producerId: ownerId, percent: ownerPercent, isOwner: true },
    ...accepted.map((collaborator) => ({
      producerId: toId(collaborator.userId),
      percent: collaborator.sharePercent,
      isOwner: false,
    })),
  ];
}

export function splitAmountInPaise(
  totalRupees: number,
  shares: SplitShare[]
): SplitAmountRow[] {
  const owner = shares.find((share) => share.isOwner);
  if (!owner) {
    throw new Error("Split shares must include the beat owner");
  }

  const totalPaise = Math.round(totalRupees * 100);
  const others = shares.filter((share) => !share.isOwner);

  let allocatedPaise = 0;
  const otherRows: SplitAmountRow[] = others.map((share) => {
    const paise = Math.floor((totalPaise * share.percent) / 100);
    allocatedPaise += paise;
    return {
      producerId: share.producerId,
      grossAmount: paise / 100,
      sharePercent: share.percent,
      isOwner: false,
    };
  });

  return [
    {
      producerId: owner.producerId,
      grossAmount: (totalPaise - allocatedPaise) / 100,
      sharePercent: owner.percent,
      isOwner: true,
    },
    ...otherRows,
  ];
}
