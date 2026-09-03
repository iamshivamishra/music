export const FOUNDING_FEE_OVERRIDE = 0;
export const FOUNDING_PERIOD_MONTHS = 6;
export const INVITE_EXPIRY_DAYS = 7;
export const SYSTEM_ACTOR_ID = "system";

export function addFoundingPeriod(from = new Date()): Date {
  const expiresAt = new Date(from);
  expiresAt.setMonth(expiresAt.getMonth() + FOUNDING_PERIOD_MONTHS);
  return expiresAt;
}

export function addInviteExpiry(from = new Date()): Date {
  const expiresAt = new Date(from);
  expiresAt.setDate(expiresAt.getDate() + INVITE_EXPIRY_DAYS);
  return expiresAt;
}
