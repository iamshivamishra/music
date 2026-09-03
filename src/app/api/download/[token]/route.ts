import { NextRequest } from "next/server";
import { guestPaymentService } from "@/lib/services/guest-payment.service";
import { formatErrorResponse, NotFoundError } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { tokenSchema } from "@/lib/validators/params";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 15, windowSec: 60, prefix: "guest-download" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const { token } = await params;
    tokenSchema.parse(token);

    const result = await guestPaymentService.getGuestDownload(token);
    if (result.status !== "valid") {
      throw new NotFoundError("Download link expired or invalid");
    }

    return Response.json(result.download);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
