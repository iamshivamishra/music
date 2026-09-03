import { NextRequest } from "next/server";
import { guestPaymentService } from "@/lib/services/guest-payment.service";
import { verifyGuestPaymentSchema } from "@/lib/validators/payment";
import { toCheckoutOrderDto } from "@/lib/serializers/order";
import { formatErrorResponse } from "@/lib/errors";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 10, windowSec: 60, prefix: "guest-verify" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const body = await request.json();
    const input = verifyGuestPaymentSchema.parse(body);

    const result = await guestPaymentService.verifyGuestPayment(
      {
        orderId: input.orderId,
        paymentId: input.paymentId,
        signature: input.signature,
      },
      input.guestEmail
    );

    return Response.json({
      success: true,
      order: toCheckoutOrderDto(result.order),
      downloadToken: result.downloadToken,
    });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
