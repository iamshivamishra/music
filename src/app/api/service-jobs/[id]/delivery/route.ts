import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { serviceJobService } from "@/lib/services/service-job.service";
import { toServiceJobDto } from "@/lib/serializers/service-job";
import {
  serviceDeliveryCompleteSchema,
  serviceDeliveryInitSchema,
} from "@/lib/validators/storage";
import { formatErrorResponse, ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 10, windowSec: 60, prefix: "service-delivery" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role !== "producer") {
      throw new ForbiddenError("Only producers can upload delivery files");
    }

    const { id } = await params;
    const body = await request.json();
    if ("fileSize" in body) {
      const input = serviceDeliveryInitSchema.parse(body);
      const result = await serviceJobService.initiateDeliveryUpload(
        id,
        session.user.id,
        input.contentType,
        input.fileSize
      );
      return Response.json(result);
    }

    const input = serviceDeliveryCompleteSchema.parse(body);
    const job = await serviceJobService.setDelivery(id, session.user.id, input.key);
    return Response.json(toServiceJobDto(job));
  } catch (error) {
    return formatErrorResponse(error);
  }
}
