import { serializeLean } from "@/lib/serializers/lean";
import type { IBeat, IBeatCollabCredit, IUser } from "@/types";

type SplitInternalKeys =
  | "collaborators"
  | "ownerSharePercent"
  | "splitsStatus"
  | "showCollabCredits";

type BeatWithoutSplitInternals = Omit<IBeat, SplitInternalKeys> & {
  collabCredits?: IBeatCollabCredit[];
};

type LeanIdFields = "_id" | "producerId" | "exclusiveBuyerId";
type LeanDateFields =
  | "createdAt"
  | "updatedAt"
  | "publishAt"
  | "publishedAt"
  | "exclusiveSoldAt";

type ClientIds = {
  _id: string;
  producerId: string;
  exclusiveBuyerId?: string;
};

type ClientDates = {
  createdAt: string;
  updatedAt: string;
  publishAt?: string;
  publishedAt?: string;
  exclusiveSoldAt?: string;
};

export type PublicBeatPayload = Omit<
  IBeat,
  | "audioFullUrl"
  | "stemsUrl"
  | "storageKeys"
  | "privateToken"
  | SplitInternalKeys
  | LeanIdFields
  | LeanDateFields
> &
  ClientIds &
  ClientDates & {
    collabCredits?: IBeatCollabCredit[];
  };

function toId(value: { toString(): string } | string): string {
  return typeof value === "string" ? value : value.toString();
}

export function buildCollabCredits(
  beat: IBeat,
  users: Pick<IUser, "_id" | "username" | "displayName" | "name">[]
): IBeatCollabCredit[] {
  if (beat.splitsStatus !== "active" || beat.showCollabCredits === false) return [];
  const userMap = new Map(users.map((user) => [toId(user._id), user]));
  return (beat.collaborators ?? [])
    .filter((collaborator) => collaborator.status === "accepted")
    .map((collaborator) => {
      const user = userMap.get(toId(collaborator.userId));
      if (!user?.username) return null;
      return {
        username: user.username,
        displayName: user.displayName || user.name,
      };
    })
    .filter((credit): credit is IBeatCollabCredit => credit !== null);
}

function stripSplitInternals(
  beat: IBeat,
  collabCredits?: IBeatCollabCredit[]
): BeatWithoutSplitInternals {
  const {
    collaborators: _collaborators,
    ownerSharePercent: _ownerSharePercent,
    splitsStatus: _splitsStatus,
    showCollabCredits: _showCollabCredits,
    ...rest
  } = beat;
  return {
    ...rest,
    collabCredits: collabCredits && collabCredits.length > 0 ? collabCredits : undefined,
  };
}

export function toPublicBeatPayload(
  beat: IBeat,
  collabCredits?: IBeatCollabCredit[]
): PublicBeatPayload & { isExclusivelySold: boolean } {
  const {
    audioFullUrl: _audioFullUrl,
    stemsUrl: _stemsUrl,
    storageKeys: _storageKeys,
    privateToken: _privateToken,
    ...safeBeat
  } = stripSplitInternals(beat, collabCredits);
  return {
    ...serializeLean(safeBeat),
    isExclusivelySold: !!beat.exclusiveBuyerId,
  } as PublicBeatPayload & { isExclusivelySold: boolean };
}

export type PublicBeatForUi = Omit<
  BeatWithoutSplitInternals,
  LeanIdFields | LeanDateFields
> &
  ClientIds &
  ClientDates & {
    producerTier?: "founding" | "standard";
  };

export interface PricedPublicBeat {
  beat: PublicBeatForUi;
  startingPrice: number | null;
}

export function toPublicBeatForUi(
  beat: IBeat,
  producer?: Pick<IUser, "displayName" | "name" | "username" | "producerTier"> | null,
  collabCredits?: IBeatCollabCredit[]
): PublicBeatForUi {
  const stripped = stripSplitInternals(beat, collabCredits);
  const sanitized = {
    ...stripped,
    audioFullUrl: "",
    stemsUrl: undefined,
    storageKeys: undefined,
    privateToken: undefined,
    exclusiveBuyerId: undefined,
    exclusiveSoldAt: undefined,
    producerName: producer?.displayName || producer?.name || "Unknown Producer",
    producerUsername: producer?.username,
    producerTier: producer?.producerTier,
  };
  return serializeLean(sanitized) as PublicBeatForUi;
}

export function generateBeatDescription(
  beat: { genre: string; bpm?: number; key?: string; mood?: string },
  producerName: string
): string {
  const parts = [`A ${beat.genre} beat`];
  if (beat.bpm) parts.push(`at ${beat.bpm} BPM`);
  if (beat.key) parts.push(`in the key of ${beat.key}`);
  if (beat.mood) parts.push(`setting a ${beat.mood} mood`);
  parts.push(`Produced by ${producerName}.`);

  return parts.join(", ").replace(/, Produced/, ". Produced");
}
