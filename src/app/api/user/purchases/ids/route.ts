import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { purchaseService } from "@/lib/services/purchase.service";
import { formatErrorResponse } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 30, windowSec: 60, prefix: "user-purchase-ids" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) {
      return Response.json({ purchasedBeatIds: [] });
    }

    const beatIdsParam = request.nextUrl.searchParams.get("beatIds");
    const requestedBeatIds = beatIdsParam
      ? beatIdsParam
          .split(",")
          .map((id) => id.trim())
          .filter(Boolean)
      : [];

    const purchasedBeatIds = requestedBeatIds.length
      ? await purchaseService.getPurchasedBeatIdsForBeats(
          session.user.id,
          requestedBeatIds
        )
      : await purchaseService.getPurchasedBeatIds(session.user.id);

    return Response.json({ purchasedBeatIds });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
