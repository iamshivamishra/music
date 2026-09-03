import { NextRequest } from "next/server";
import { beatService } from "@/lib/services/beat.service";
import { formatErrorResponse } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import { objectIdSchema } from "@/lib/validators/params";
import { shareBodySchema } from "@/lib/validators/analytics";

/**
 * POST /api/beats/[id]/share
 *
 * Fire-and-forget share counter increment. No auth required.
 * Optional JSON body `{ source }` is allowlisted; unknown values become `other`.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, {
      limit: 30,
      windowSec: 60,
      prefix: "share",
    });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const { id } = await params;
    objectIdSchema.parse(id);

    let source: string | undefined;
    try {
      const contentType = request.headers.get("content-type") ?? "";
      if (contentType.includes("application/json")) {
        const parsed = shareBodySchema.safeParse(await request.json());
        if (parsed.success) source = parsed.data.source;
      }
    } catch {
      /* ignore invalid JSON */
    }

    await beatService.incrementShareCount(id, source);

    logger.debug("Beat shared", { beatId: id, ip });

    return Response.json({ success: true });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export const runtime = "nodejs";
