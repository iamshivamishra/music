import { auth } from "@/lib/auth";
import { studioService } from "@/lib/services/studio.service";
import { formatErrorResponse } from "@/lib/errors";
import { requireProducer } from "@/lib/auth/role-checks";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 30, windowSec: 60, prefix: "studio-analytics" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    requireProducer(session);

    const result = await studioService.getAnalytics(session.user.id);
    return Response.json(result);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
