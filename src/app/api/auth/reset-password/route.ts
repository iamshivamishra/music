import { NextRequest } from "next/server";
import { resetPasswordSchema } from "@/lib/validators/auth";
import { authService } from "@/lib/services/auth.service";
import { formatErrorResponse } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, {
      limit: 5,
      windowSec: 900,
      prefix: "reset-pw",
    });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const body = await request.json();
    const { token, password } = resetPasswordSchema.parse(body);

    await authService.resetPassword(token, password);

    return Response.json({
      message: "Your password has been reset successfully.",
    });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
