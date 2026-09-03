import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { authService } from "@/lib/services/auth.service";
import { updateProfileSchema } from "@/lib/validators/auth";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 10, windowSec: 60, prefix: "user-profile" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const user = await authService.getProfile(session.user.id);
    return Response.json({ user });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 10, windowSec: 60, prefix: "user-profile" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const body = await request.json();
    const input = updateProfileSchema.parse(body);

    const user = await authService.updateProfile(session.user.id, input);
    return Response.json({ user });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
