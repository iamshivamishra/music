import { packRepository } from "@/lib/repositories/pack.repository";
import { generatePrivateToken } from "@/lib/services/beat-access";
import { ConflictError, ValidationError } from "@/lib/errors";
import { isFeatureEnabled } from "@/lib/feature-flags";
import type { BeatStatus, IBeat } from "@/types";

export async function assertNotInPublishedPack(beatId: string) {
  const pack = await packRepository.findPublishedPackContainingBeat(beatId);
  if (pack) {
    throw new ConflictError(
      `This beat is in the published pack "${pack.title}". Remove it from the pack before unlisting or scheduling.`
    );
  }
}

export function visibilityFields(
  beat: Pick<IBeat, "status" | "privateToken">,
  status: BeatStatus,
  publishAt?: Date
): { set: Partial<IBeat>; unset: string[] } {
  if (
    (status === "unlisted" || status === "scheduled") &&
    !isFeatureEnabled("privateDrops")
  ) {
    throw new ValidationError("Private drops and scheduled publishing are disabled");
  }
  const set: Partial<IBeat> = {
    status,
    isPublished: status === "published",
  };
  const unset: string[] = [];

  if (status === "published") {
    if (beat.status !== "published") {
      set.publishedAt = new Date();
    }
    unset.push("privateToken", "publishAt");
  } else if (status === "unlisted") {
    if (!beat.privateToken) {
      set.privateToken = generatePrivateToken();
    }
    if (publishAt) {
      set.publishAt = publishAt;
    } else {
      unset.push("publishAt");
    }
  } else if (status === "scheduled") {
    if (!publishAt) {
      throw new ValidationError("Publish date is required when scheduling a beat");
    }
    set.publishAt = publishAt;
    unset.push("privateToken");
  } else {
    unset.push("privateToken", "publishAt");
  }

  return { set, unset };
}

export async function visibilityChange(
  beat: IBeat,
  status: BeatStatus,
  publishAt?: Date
): Promise<{ set: Partial<IBeat>; unset: string[] }> {
  if (status === "unlisted" || status === "scheduled") {
    await assertNotInPublishedPack(beat._id.toString());
  }
  return visibilityFields(beat, status, publishAt);
}
