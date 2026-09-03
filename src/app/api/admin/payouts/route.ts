import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { payoutService } from "@/lib/services/payout.service";
import { formatErrorResponse } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth/role-checks";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 30, windowSec: 60, prefix: "admin-payouts" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    requireAdmin(session);

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));

    const result = await payoutService.getPendingPayouts(page, limit);
    return Response.json(result);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
