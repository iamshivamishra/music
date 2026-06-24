import { NextRequest } from "next/server";
import { logger } from "@/lib/logger";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const rl = await rateLimit(ip, { limit: 30, windowSec: 60, prefix: "error-report" });
  if (!rl.success) return rateLimitResponse(rl.resetAt);

  try {
    const body = await request.json();

    logger.error("CLIENT_ERROR", {
      message: body.message,
      stack: body.stack?.substring(0, 2000),
      source: body.source,
      url: body.url,
      userAgent: body.userAgent?.substring(0, 300),
      timestamp: body.timestamp,
      ip,
    });

    return Response.json({ ok: true });
  } catch {
    return Response.json({ ok: false }, { status: 400 });
  }
}
