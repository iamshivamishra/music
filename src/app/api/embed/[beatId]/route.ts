import { NextRequest, NextResponse } from "next/server";
import { embedService } from "@/lib/services/embed.service";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { formatErrorResponse } from "@/lib/errors";
import { embedCorsHeaders, embedCorsPreflight, withEmbedCors } from "@/lib/embed-cors";

const METHODS = "GET, OPTIONS";

export async function OPTIONS() {
  return embedCorsPreflight(METHODS);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ beatId: string }> }
) {
  try {
    const { beatId } = await params;

    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 60, windowSec: 60, prefix: "embed-api" });
    if (!rl.success) {
      return withEmbedCors(rateLimitResponse(rl.resetAt), METHODS);
    }

    const data = await embedService.getBeatData(beatId);

    return NextResponse.json(data, { headers: embedCorsHeaders(METHODS) });
  } catch (error) {
    return withEmbedCors(formatErrorResponse(error), METHODS);
  }
}
