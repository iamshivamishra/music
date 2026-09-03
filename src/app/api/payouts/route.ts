import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { payoutService } from "@/lib/services/payout.service";
import { requestPayoutSchema } from "@/lib/validators/payout";
import { formatErrorResponse } from "@/lib/errors";
import { requireProducer } from "@/lib/auth/role-checks";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    requireProducer(session);

    const { searchParams } = request.nextUrl;
    const page = Math.max(1, Number(searchParams.get("page") ?? 1));
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit") ?? 20)));

    const result = await payoutService.getPayoutHistory(session.user.id, page, limit);
    return Response.json(result);
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 3, windowSec: 86400, prefix: "payout-request" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    requireProducer(session);

    const body = await request.json();
    const input = requestPayoutSchema.parse(body);
    const payout = await payoutService.requestPayout(session.user.id, input);

    return Response.json(payout, { status: 201 });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
