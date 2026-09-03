import { auth } from "@/lib/auth";
import { producerService } from "@/lib/services/producer.service";
import { updateProducerTierSchema } from "@/lib/validators/invitation";
import { formatErrorResponse } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth/role-checks";
import { objectIdSchema } from "@/lib/validators/params";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 30, windowSec: 60, prefix: "admin-producers" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    requireAdmin(session);

    const { id } = await params;
    objectIdSchema.parse(id);
    const body = await request.json();
    const input = updateProducerTierSchema.parse(body);

    const user = await producerService.updateTier(id, input, session.user.id);
    return Response.json({ user });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
