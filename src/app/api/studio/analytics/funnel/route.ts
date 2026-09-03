import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { analyticsService } from "@/lib/services/analytics.service";
import { funnelQuerySchema } from "@/lib/validators/analytics";
import { formatErrorResponse, ForbiddenError, UnauthorizedError } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role !== "producer" && session.user.role !== "admin") {
      throw new ForbiddenError("Only producers can access analytics");
    }

    const parsed = funnelQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const result = await analyticsService.getFunnelAnalytics(session.user.id, parsed.days);
    return Response.json(result);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
