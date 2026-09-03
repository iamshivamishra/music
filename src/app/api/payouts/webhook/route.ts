import { NextRequest } from "next/server";
import { payoutService } from "@/lib/services/payout.service";
import { razorpayx } from "@/lib/razorpayx";
import { logger } from "@/lib/logger";
import { formatErrorResponse, AppError, ValidationError } from "@/lib/errors";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 60, windowSec: 60, prefix: "payout-webhook" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const rawBody = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature || !razorpayx.verifyWebhookSignature(rawBody, signature)) {
      logger.warn("RazorpayX webhook signature verification failed");
      throw new ValidationError("Invalid signature");
    }

    let event: { event: string; payload: Record<string, unknown> };
    try {
      event = JSON.parse(rawBody);
    } catch {
      throw new ValidationError("Invalid JSON");
    }

    try {
      await payoutService.processWebhook(event.event, event.payload);
    } catch (error) {
      logger.error("RazorpayX webhook processing failed", {
        event: event.event,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new AppError("Processing failed", 500, "WEBHOOK_PROCESSING_FAILED");
    }

    return Response.json({ received: true });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
