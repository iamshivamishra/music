import { NextRequest, NextResponse } from "next/server";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/user/downloads
 *
 * @deprecated Use GET /api/user/library instead. This route proxies to
 * the canonical library endpoint to avoid breaking existing callers.
 */
export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimit(ip, { limit: 20, windowSec: 60, prefix: "user-downloads" });
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  const target = new URL("/api/user/library", request.url);
  request.nextUrl.searchParams.forEach((v, k) => target.searchParams.set(k, v));
  return NextResponse.rewrite(target);
}

export const runtime = "nodejs";
