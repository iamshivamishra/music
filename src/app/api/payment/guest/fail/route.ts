import { NextRequest } from "next/server";
import { guestPaymentService } from "@/lib/services/guest-payment.service";
import { failGuestOrderSchema } from "@/lib/validators/payment";
import { formatErrorResponse } from "@/lib/errors";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 10, windowSec: 60, prefix: "guest-fail" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const body = await request.json();
    const { orderId, guestEmail, reason } = failGuestOrderSchema.parse(body);

    await guestPaymentService.markFailed(orderId, guestEmail, reason);

    return Response.json({ message: "Order marked as failed" });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
