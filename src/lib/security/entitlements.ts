interface EntitlementLicense {
  beatId: string | { toString(): string };
  isActive: boolean;
  includesWav: boolean;
  includesStems: boolean;
}

interface EntitlementPurchase {
  includesWav?: boolean;
  includesStems?: boolean;
}

export function resolvePurchaseEntitlements(
  purchase: EntitlementPurchase,
  license: EntitlementLicense | null,
  beatId: string
): { wavAllowed: boolean; stemsAllowed: boolean; licenseMatchesBeat: boolean } {
  const licenseMatchesBeat =
    !!license && license.beatId.toString() === beatId && license.isActive;

  const wavAllowed = typeof purchase.includesWav === "boolean"
    ? purchase.includesWav
    : licenseMatchesBeat
      ? license.includesWav
      : false;
  const stemsAllowed = typeof purchase.includesStems === "boolean"
    ? purchase.includesStems
    : licenseMatchesBeat
      ? license.includesStems
      : false;

  return { wavAllowed, stemsAllowed, licenseMatchesBeat };
}
