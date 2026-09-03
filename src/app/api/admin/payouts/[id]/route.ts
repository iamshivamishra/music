import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { payoutService } from "@/lib/services/payout.service";
import { adminProcessPayoutSchema } from "@/lib/validators/payout";
import { formatErrorResponse } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth/role-checks";
import { objectIdSchema } from "@/lib/validators/params";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 30, windowSec: 60, prefix: "admin-payouts" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    requireAdmin(session);

    const { id } = await params;
    objectIdSchema.parse(id);
    const body = await request.json();
    const input = adminProcessPayoutSchema.parse(body);

    let payout;
    if (input.action === "approve") {
      payout = await payoutService.adminApprovePayout(id, session.user.id);
    } else {
      payout = await payoutService.adminRejectPayout(id, session.user.id, input.reason);
    }

    return Response.json(payout);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
