import { NextRequest } from "next/server";
import { beatService } from "@/lib/services/beat.service";
import { formatErrorResponse } from "@/lib/errors";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 60, windowSec: 60, prefix: "plays" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const { id } = await params;
    await beatService.incrementPlays(id);
    return Response.json({ success: true });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
