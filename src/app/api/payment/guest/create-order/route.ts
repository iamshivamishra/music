import { NextRequest } from "next/server";
import { guestPaymentService } from "@/lib/services/guest-payment.service";
import { createGuestOrderSchema } from "@/lib/validators/payment";
import { attributionFromCookies } from "@/lib/attribution";
import { formatErrorResponse } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { resolveUnlistedAccessToken } from "@/lib/unlisted-token";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 5, windowSec: 3600, prefix: "guest-order" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const body = await request.json();
    const input = createGuestOrderSchema.parse(body);
    const accessToken = await resolveUnlistedAccessToken({
      beatId: input.beatId,
      bodyToken: input.accessToken,
    });

    const emailRl = await rateLimit(input.guestEmail, {
      limit: 3,
      windowSec: 86400,
      prefix: "guest-order-email",
    });
    if (!emailRl.success) return rateLimitResponse(emailRl.resetAt);

    const attribution = attributionFromCookies(request.cookies);
    const order = await guestPaymentService.createGuestOrder(
      { ...input, accessToken },
      attribution
    );

    return Response.json(order);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
