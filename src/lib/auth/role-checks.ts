import type { Session } from "next-auth";
import { UnauthorizedError, ForbiddenError } from "@/lib/errors";

/**
 * Assert that a session exists and the user has one of the given roles.
 * Throws UnauthorizedError if not logged in, ForbiddenError if role mismatch.
 */
export function requireRole(session: Session | null, ...roles: string[]): asserts session is Session {
  if (!session?.user) throw new UnauthorizedError();
  if (!roles.includes(session.user.role)) throw new ForbiddenError();
}

/**
 * Require the user to be a producer or admin.
 */
export function requireProducer(session: Session | null): asserts session is Session {
  requireRole(session, "producer", "admin");
}

/**
 * Require the user to be an admin.
 */
export function requireAdmin(session: Session | null): asserts session is Session {
  requireRole(session, "admin");
}
