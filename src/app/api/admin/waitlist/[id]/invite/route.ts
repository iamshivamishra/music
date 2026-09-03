import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { waitlistService } from "@/lib/services/waitlist.service";
import { formatErrorResponse, NotFoundError } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth/role-checks";
import { objectIdSchema } from "@/lib/validators/params";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(_request);
    const rl = await rateLimit(ip, { limit: 30, windowSec: 60, prefix: "admin-waitlist" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    requireAdmin(session);

    const { id } = await params;
    objectIdSchema.parse(id);
    const entry = await waitlistService.invite(id, session.user.id);
    if (!entry) throw new NotFoundError("Waitlist entry");

    return Response.json({ success: true, entry });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
