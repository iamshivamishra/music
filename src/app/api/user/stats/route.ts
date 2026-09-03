import { auth } from "@/lib/auth";
import { purchaseService } from "@/lib/services/purchase.service";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 30, windowSec: 60, prefix: "user-stats" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const stats = await purchaseService.getBuyerStats(session.user.id);

    return Response.json(stats);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
