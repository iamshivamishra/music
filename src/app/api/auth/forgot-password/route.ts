import { NextRequest } from "next/server";
import { forgotPasswordSchema } from "@/lib/validators/auth";
import { authService } from "@/lib/services/auth.service";
import { formatErrorResponse } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    // Rate-limit by IP first to block brute-force before touching the body
    const ipRl = await rateLimit(ip, {
      limit: 10,
      windowSec: 900,
      prefix: "forgot-pw-ip",
    });
    if (!ipRl.success) return rateLimitResponse(ipRl.resetAt);

    const body = await request.json();
    const { email } = forgotPasswordSchema.parse(body);

    // Tighter per-email limit
    const emailRl = await rateLimit(`${ip}:${email}`, {
      limit: 3,
      windowSec: 900,
      prefix: "forgot-pw",
    });
    if (!emailRl.success) return rateLimitResponse(emailRl.resetAt);

    await authService.forgotPassword(email);

    // Always return success to prevent email enumeration
    return Response.json({
      message:
        "If an account with that email exists, we sent a password reset link.",
    });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
