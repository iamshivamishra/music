import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { serviceJobService } from "@/lib/services/service-job.service";
import { toServiceJobDto } from "@/lib/serializers/service-job";
import { adminJobActionSchema } from "@/lib/validators/service-job";
import { formatErrorResponse, ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 20, windowSec: 60, prefix: "admin-job" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role !== "admin") throw new ForbiddenError("Admin access required");

    const { id } = await params;
    const { action } = adminJobActionSchema.parse(await request.json());
    const job =
      action === "refund"
        ? await serviceJobService.adminRefund(id, session.user.id)
        : await serviceJobService.adminComplete(id, session.user.id);
    return Response.json(toServiceJobDto(job));
  } catch (error) {
    return formatErrorResponse(error);
  }
}
