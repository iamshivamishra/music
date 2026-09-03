import { isMaskedPan, maskPan } from "@/lib/validators/tax";
import type { TaxProfileInput } from "@/lib/validators/tax";
import type { ITaxProfile, IUser } from "@/types";

export function withMaskedTaxProfile(user: IUser): IUser {
  if (!user.taxProfile?.pan) return user;
  return {
    ...user,
    taxProfile: {
      ...user.taxProfile,
      pan: maskPan(user.taxProfile.pan),
    },
  };
}

export function mergeTaxProfile(
  existing: ITaxProfile | undefined,
  input: TaxProfileInput
): ITaxProfile {
  const next: ITaxProfile = { ...existing };

  if (input.gstin !== undefined) {
    if (input.gstin === "") delete next.gstin;
    else next.gstin = input.gstin;
  }

  if (input.pan !== undefined) {
    if (input.pan === "") delete next.pan;
    else if (!isMaskedPan(input.pan)) next.pan = input.pan;
  }

  if (input.legalName !== undefined) {
    if (input.legalName.trim() === "") delete next.legalName;
    else next.legalName = input.legalName.trim();
  }

  if (input.stateCode !== undefined) {
    if (input.stateCode === "") delete next.stateCode;
    else next.stateCode = input.stateCode;
  }

  if (input.isComposition !== undefined) {
    next.isComposition = input.isComposition;
  }

  return next;
}
