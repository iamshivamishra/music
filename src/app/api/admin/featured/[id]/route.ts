import { auth } from "@/lib/auth";
import { featuredService } from "@/lib/services/featured.service";
import { formatErrorResponse, NotFoundError } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth/role-checks";
import { objectIdSchema } from "@/lib/validators/params";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const ip = getClientIp(_request);
    const rl = await rateLimit(ip, { limit: 30, windowSec: 60, prefix: "admin-featured" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    requireAdmin(session);

    const { id } = await params;
    objectIdSchema.parse(id);
    const deleted = await featuredService.delete(id, session.user.id);

    if (!deleted) {
      throw new NotFoundError("Featured entry");
    }

    return Response.json({ success: true });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
