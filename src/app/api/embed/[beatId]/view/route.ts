import { NextRequest, NextResponse } from "next/server";
import { embedService } from "@/lib/services/embed.service";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { formatErrorResponse } from "@/lib/errors";
import { embedCorsHeaders, embedCorsPreflight, withEmbedCors } from "@/lib/embed-cors";

const METHODS = "POST, OPTIONS";

export async function OPTIONS() {
  return embedCorsPreflight(METHODS);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ beatId: string }> }
) {
  try {
    const { beatId } = await params;

    const ip = getClientIp(request);
    const rl = await rateLimit(ip, {
      limit: 30,
      windowSec: 60,
      prefix: "embed-view",
    });
    if (!rl.success) {
      return withEmbedCors(rateLimitResponse(rl.resetAt), METHODS);
    }

    await embedService.recordView(beatId);

    return NextResponse.json({ success: true }, { headers: embedCorsHeaders(METHODS) });
  } catch (error) {
    return withEmbedCors(formatErrorResponse(error), METHODS);
  }
}
