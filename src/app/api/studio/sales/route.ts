import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { studioService } from "@/lib/services/studio.service";
import { formatErrorResponse } from "@/lib/errors";
import { requireProducer } from "@/lib/auth/role-checks";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 30, windowSec: 60, prefix: "studio-sales" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    requireProducer(session);

    const page = parseInt(request.nextUrl.searchParams.get("page") || "1", 10);
    const limit = parseInt(request.nextUrl.searchParams.get("limit") || "20", 10);

    const result = await studioService.getSales(session.user.id, page, limit);

    return Response.json(result);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
