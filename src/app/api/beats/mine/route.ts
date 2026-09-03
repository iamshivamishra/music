import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { beatService } from "@/lib/services/beat.service";
import { formatErrorResponse } from "@/lib/errors";
import { requireProducer } from "@/lib/auth/role-checks";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import type { BeatStatus } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 30, windowSec: 60, prefix: "beats-mine" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    requireProducer(session);

    const searchParams = request.nextUrl.searchParams;
    const status = (searchParams.get("status") || undefined) as BeatStatus | undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const [result, stats, earnings] = await Promise.all([
      beatService.listByProducer(session.user.id, status, page, limit),
      beatService.getProducerStats(session.user.id),
      beatService.getProducerEarnings(session.user.id),
    ]);

    return Response.json({ ...result, stats, earnings });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
