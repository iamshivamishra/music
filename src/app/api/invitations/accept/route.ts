import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { invitationService } from "@/lib/services/invitation.service";
import { acceptInvitationSchema } from "@/lib/validators/invitation";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 10, windowSec: 60, prefix: "invite-validate" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const token = request.nextUrl.searchParams.get("token");
    const result = await invitationService.validate(token ?? "");
    return Response.json(result);
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      throw new UnauthorizedError();
    }

    const body = await request.json();
    const { token } = acceptInvitationSchema.parse(body);
    const result = await invitationService.accept(token, session.user.id);

    return Response.json({ success: true, ...result });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
