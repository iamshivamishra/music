import { NextRequest } from "next/server";
import { signupSchema } from "@/lib/validators/auth";
import { authService } from "@/lib/services/auth.service";
import { formatErrorResponse } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 5, windowSec: 300, prefix: "signup" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const body = await request.json();
    const input = signupSchema.parse(body);
    const inviteToken = typeof body.inviteToken === "string" ? body.inviteToken : undefined;
    const user = await authService.signup({ ...input, inviteToken });

    return Response.json(
      {
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return formatErrorResponse(error);
  }
}
