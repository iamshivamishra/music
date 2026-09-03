import { ConflictError, NotFoundError } from "@/lib/errors";
import { canFulfillBeat, canPurchaseBeat, isLicensable } from "@/lib/services/beat-access";
import type { IBeat, ILicense } from "@/types";

/**
 * Validates that a beat is available for purchase.
 * Throws typed errors if the beat is missing, unpublished, or exclusively sold.
 */
export function assertBeatPurchasable(
  beat: IBeat | null | undefined,
  license?: ILicense | null,
  options?: {
    beatId?: string;
    accessToken?: string;
    userId?: string;
    userRole?: string;
  }
): asserts beat is IBeat {
  if (!beat) throw new NotFoundError("Beat");

  const purchasable = canPurchaseBeat(beat, {
    accessToken: options?.accessToken,
    userId: options?.userId,
    userRole: options?.userRole,
  });

  if (!purchasable) {
    throw new ConflictError("This beat is not available for purchase");
  }

  if (license !== undefined) {
    assertLicenseValid(license, options?.beatId);
  }
}

export function assertBeatFulfillable(
  beat: IBeat | null | undefined
): asserts beat is IBeat {
  if (!beat) throw new NotFoundError("Beat");
  if (!canFulfillBeat(beat)) {
    throw new ConflictError("Beat is no longer available for purchase");
  }
}

export function assertBeatLicensable(
  beat: IBeat | null | undefined
): asserts beat is IBeat {
  if (!beat) throw new NotFoundError("Beat");
  if (!isLicensable(beat)) {
    throw new ConflictError("This beat is not available");
  }
}

/**
 * Validates that a license exists, is active, and belongs to the given beat.
 */
export function assertLicenseValid(
  license: ILicense | null | undefined,
  beatId?: string
): asserts license is ILicense {
  if (!license || !license.isActive) {
    throw new NotFoundError("License");
  }

  if (beatId && license.beatId.toString() !== beatId) {
    throw new ConflictError("License does not belong to this beat");
  }
}
