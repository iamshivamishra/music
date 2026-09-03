import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { authService } from "@/lib/services/auth.service";
import { invitationService } from "@/lib/services/invitation.service";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { onboardingSchema } from "@/lib/validators/auth";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 5, windowSec: 60, prefix: "onboarding" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const body = await request.json();
    const { role, inviteToken } = onboardingSchema.parse(body);

    if (inviteToken) {
      await invitationService.accept(inviteToken, session.user.id);
    } else {
      await authService.setRole(session.user.id, role);
    }

    const user = await authService.getProfile(session.user.id);

    return Response.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
