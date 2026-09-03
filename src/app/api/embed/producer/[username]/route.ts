import { NextRequest, NextResponse } from "next/server";
import { embedService } from "@/lib/services/embed.service";
import { embedCatalogQuerySchema } from "@/lib/validators/embed";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { formatErrorResponse } from "@/lib/errors";
import { embedCorsHeaders, embedCorsPreflight, withEmbedCors } from "@/lib/embed-cors";

const METHODS = "GET, OPTIONS";

export async function OPTIONS() {
  return embedCorsPreflight(METHODS);
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username } = await params;

    const ip = getClientIp(request);
    const rl = await rateLimit(ip, {
      limit: 30,
      windowSec: 60,
      prefix: "embed-producer-api",
    });
    if (!rl.success) {
      return withEmbedCors(rateLimitResponse(rl.resetAt), METHODS);
    }

    const { limit } = embedCatalogQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );

    const catalog = await embedService.getProducerCatalog(username, limit);

    return NextResponse.json(catalog, { headers: embedCorsHeaders(METHODS) });
  } catch (error) {
    return withEmbedCors(formatErrorResponse(error), METHODS);
  }
}
