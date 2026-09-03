import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { serviceJobService } from "@/lib/services/service-job.service";
import { toServiceJobDto } from "@/lib/serializers/service-job";
import { createServiceJobSchema, parseServiceJobListQuery } from "@/lib/validators/service-job";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const parsed = parseServiceJobListQuery(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const result =
      session.user.role === "producer" &&
      request.nextUrl.searchParams.get("inbox") === "studio"
      ? await serviceJobService.listForProducer(
          session.user.id,
          parsed.status,
          parsed.page,
          parsed.limit
        )
      : await serviceJobService.listForBuyer(
          session.user.id,
          parsed.status,
          parsed.page,
          parsed.limit
        );

    return Response.json({
      ...result,
      data: result.data.map(toServiceJobDto),
    });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 8, windowSec: 60, prefix: "service-job-create" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const input = createServiceJobSchema.parse(await request.json());
    const checkout = await serviceJobService.createWithDeposit(session.user.id, input);
    return Response.json(checkout, { status: 201 });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
