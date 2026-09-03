import crypto from "crypto";
import { timingSafeEqualString } from "@/lib/crypto/timing-safe-equal";
import { isListed } from "@/lib/beat-listing";
import type { IBeat } from "@/types";

export { isListed };

export const PRIVATE_TOKEN_BYTES = 16;

export interface BeatAccessContext {
  userId?: string;
  userRole?: string;
  accessToken?: string;
}

export function generatePrivateToken(): string {
  return crypto.randomBytes(PRIVATE_TOKEN_BYTES).toString("base64url");
}

export function tokensMatch(
  expected?: string | null,
  received?: string | null
): boolean {
  if (!expected || !received) return false;
  return timingSafeEqualString(expected, received);
}

export function isOwnerOrAdmin(
  beat: Pick<IBeat, "producerId">,
  ctx: BeatAccessContext
): boolean {
  if (ctx.userRole === "admin") return true;
  if (!ctx.userId) return false;
  return beat.producerId.toString() === ctx.userId;
}

function isExclusiveBuyer(
  beat: Pick<IBeat, "exclusiveBuyerId">,
  ctx: BeatAccessContext
): boolean {
  if (!ctx.userId || !beat.exclusiveBuyerId) return false;
  return beat.exclusiveBuyerId.toString() === ctx.userId;
}

export function hasUnlistedToken(
  beat: Pick<IBeat, "status" | "privateToken">,
  accessToken?: string
): boolean {
  return beat.status === "unlisted" && tokensMatch(beat.privateToken, accessToken);
}

export function canViewBeat(beat: IBeat, ctx: BeatAccessContext = {}): boolean {
  if (isOwnerOrAdmin(beat, ctx)) return true;
  if (isListed(beat)) return true;
  if (hasUnlistedToken(beat, ctx.accessToken)) return true;
  if (beat.status === "archived" && isExclusiveBuyer(beat, ctx)) return true;
  return false;
}

export function isLicensable(
  beat: Pick<IBeat, "status" | "isPublished" | "exclusiveBuyerId">
): boolean {
  if (beat.exclusiveBuyerId) return false;
  return isListed(beat) || beat.status === "unlisted";
}

export function canPurchaseBeat(
  beat: IBeat,
  ctx: BeatAccessContext = {}
): boolean {
  if (!isLicensable(beat)) return false;
  if (isListed(beat)) return true;
  return hasUnlistedToken(beat, ctx.accessToken);
}

export function canFulfillBeat(
  beat: Pick<IBeat, "status" | "isPublished" | "exclusiveBuyerId">
): boolean {
  return isLicensable(beat);
}

export function canShareBeat(beat: Pick<IBeat, "status" | "isPublished">): boolean {
  return isListed(beat) || beat.status === "unlisted";
}

export function shouldNoIndex(beat: Pick<IBeat, "status" | "isPublished">): boolean {
  return !isListed(beat);
}
