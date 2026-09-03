import { auth } from "@/lib/auth";
import { payoutService } from "@/lib/services/payout.service";
import { formatErrorResponse } from "@/lib/errors";
import { requireProducer } from "@/lib/auth/role-checks";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 20, windowSec: 60, prefix: "payouts-balance" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    requireProducer(session);

    const balance = await payoutService.getBalance(session.user.id);
    return Response.json(balance);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
