export function getDefaultPlatformFeePercent(): number {
  return Number(process.env.PLATFORM_FEE_PERCENT ?? 10);
}

export function resolvePlatformFeePercent(user: {
  platformFeeOverride?: number | null;
  producerTierExpiresAt?: Date | string | null;
} | null | undefined): number {
  const defaultFee = getDefaultPlatformFeePercent();
  if (!user) return defaultFee;

  const expiresAt = user.producerTierExpiresAt
    ? new Date(user.producerTierExpiresAt)
    : null;
  const isOverrideActive = expiresAt == null || expiresAt > new Date();

  if (typeof user.platformFeeOverride === "number" && isOverrideActive) {
    return user.platformFeeOverride;
  }

  return defaultFee;
}
