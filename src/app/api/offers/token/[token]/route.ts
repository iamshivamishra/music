import { NextRequest } from "next/server";
import { offerService } from "@/lib/services/offer.service";
import { formatErrorResponse, NotFoundError } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

interface RouteParams {
  params: Promise<{ token: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 30, windowSec: 60, prefix: "offer-token" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const { token } = await params;
    const offer = await offerService.getPublicByToken(token);
    if (!offer) throw new NotFoundError("Offer");

    return Response.json(offer);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
