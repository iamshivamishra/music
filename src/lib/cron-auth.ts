import type { NextRequest } from "next/server";
import { UnauthorizedError } from "@/lib/errors";
import { timingSafeEqualString } from "@/lib/crypto/timing-safe-equal";
import { logger } from "@/lib/logger";

export function authorizeCron(request: NextRequest): void {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    logger.warn("CRON_SECRET is not configured");
    throw new UnauthorizedError("Cron is not configured");
  }

  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!timingSafeEqualString(secret, token)) {
    throw new UnauthorizedError();
  }
}
