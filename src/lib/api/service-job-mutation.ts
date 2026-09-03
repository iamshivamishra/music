import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { toServiceJobDto } from "@/lib/serializers/service-job";
import { formatErrorResponse, ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import type { IServiceJob } from "@/types";

interface Options {
  prefix: string;
  limit?: number;
  actor?: "producer" | "buyer" | "either";
  handler: (jobId: string, userId: string) => Promise<IServiceJob>;
}

export function serviceJobMutationPost({ prefix, limit = 10, actor, handler }: Options) {
  return async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
  ) {
    try {
      const ip = getClientIp(request);
      const rl = await rateLimit(ip, { limit, windowSec: 60, prefix });
      if (!rl.success) return rateLimitResponse(rl.resetAt);

      const session = await auth();
      if (!session?.user) throw new UnauthorizedError();
      if (actor === "producer" && session.user.role !== "producer") {
        throw new ForbiddenError("Only producers can do this");
      }

      const { id } = await params;
      const job = await handler(id, session.user.id);
      return Response.json(toServiceJobDto(job));
    } catch (error) {
      return formatErrorResponse(error);
    }
  };
}
