import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { serviceJobService } from "@/lib/services/service-job.service";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 8, windowSec: 60, prefix: "service-job-balance" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    const { id } = await params;
    const checkout = await serviceJobService.createBalanceCheckout(id, session.user.id);
    return Response.json(checkout);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
