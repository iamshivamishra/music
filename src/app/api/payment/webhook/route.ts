import { NextRequest } from "next/server";
import { paymentService } from "@/lib/services/payment.service";
import { verifyWebhookSignature } from "@/lib/razorpay";
import { logger } from "@/lib/logger";
import { formatErrorResponse, AppError, ValidationError } from "@/lib/errors";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 60, windowSec: 60, prefix: "payment-webhook" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!process.env.RAZORPAY_WEBHOOK_SECRET) {
      logger.warn("Razorpay webhook secret not configured");
      throw new AppError("Webhook not configured", 500, "WEBHOOK_NOT_CONFIGURED");
    }

    if (!signature || !verifyWebhookSignature(rawBody, signature)) {
      logger.warn("Webhook signature verification failed");
      throw new ValidationError("Invalid signature");
    }

    let event: {
      event: string;
      payload: {
        payment?: { entity: { id: string; order_id: string } };
        refund?: { entity: { id: string; payment_id: string } };
      };
    };

    try {
      event = JSON.parse(rawBody);
    } catch {
      throw new ValidationError("Invalid JSON");
    }

    try {
      await paymentService.handleWebhookEvent(event);
    } catch (error) {
      logger.error("Webhook: fulfillment failed", {
        eventType: event.event,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new AppError("Fulfillment failed", 500, "WEBHOOK_FULFILLMENT_FAILED");
    }

    return Response.json({ received: true });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
