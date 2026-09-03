import { auth } from "@/lib/auth";
import { invitationService } from "@/lib/services/invitation.service";
import { sendInvitationSchema } from "@/lib/validators/invitation";
import { formatErrorResponse } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth/role-checks";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 30, windowSec: 60, prefix: "admin-invitations" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    requireAdmin(session);

    const { data, total } = await invitationService.list();
    return Response.json({ invitations: data, total });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 30, windowSec: 60, prefix: "admin-invitations" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    requireAdmin(session);

    const body = await request.json();
    const { email, name } = sendInvitationSchema.parse(body);
    const invitation = await invitationService.send(email, name, session.user.id);

    return Response.json({ invitation }, { status: 201 });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
