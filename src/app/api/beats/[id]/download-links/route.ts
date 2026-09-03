import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { downloadService } from "@/lib/services/download.service";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { objectIdSchema } from "@/lib/validators/params";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

/**
 * GET /api/beats/[id]/download-links
 *
 * Returns all download links with entitlement information for a purchased beat.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(_request);
    const rl = await rateLimit(ip, { limit: 20, windowSec: 60, prefix: "download-links" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { id } = await params;
    objectIdSchema.parse(id);
    const access = await downloadService.getDownloadLinks(session.user.id, id);

    return Response.json(access);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
