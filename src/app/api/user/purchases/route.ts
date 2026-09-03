import { auth } from "@/lib/auth";
import { purchaseService } from "@/lib/services/purchase.service";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { NextRequest } from "next/server";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await rateLimit(ip, { limit: 30, windowSec: 60, prefix: "user-purchases" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const params = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(params.get("limit") ?? "12", 10) || 12));

    const result = await purchaseService.getBeatPurchasesPaginated(
      session.user.id,
      page,
      limit
    );

    return Response.json(result);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
