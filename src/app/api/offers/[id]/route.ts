import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { offerService } from "@/lib/services/offer.service";
import { formatErrorResponse, ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 20, windowSec: 60, prefix: "offer-withdraw" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role !== "producer" && session.user.role !== "admin") {
      throw new ForbiddenError("Only producers can withdraw offers");
    }

    const { id } = await params;
    const offer = await offerService.withdraw(session.user.id, id);
    return Response.json(offer);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
