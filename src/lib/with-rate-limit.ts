import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp, rateLimitResponse, type RateLimitConfig } from "./rate-limit";

type RouteHandler = (
  request: NextRequest,
  context?: unknown
) => Promise<NextResponse | Response>;

/**
 * Higher-order function that wraps an API route handler with rate limiting.
 *
 * Usage:
 *   export const POST = withRateLimit(handler, { limit: 5, windowSec: 60, prefix: "auth" });
 */
export function withRateLimit(
  handler: RouteHandler,
  config: RateLimitConfig
): RouteHandler {
  return async (request: NextRequest, context?: unknown) => {
    const ip = getClientIp(request);
    const { success, remaining, resetAt } = rateLimit(ip, config);

    if (!success) {
      return rateLimitResponse(resetAt);
    }

    const response = await handler(request, context);

    const headers = new Headers(response.headers);
    headers.set("X-RateLimit-Remaining", String(remaining));
    headers.set("X-RateLimit-Reset", new Date(resetAt).toISOString());

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}
