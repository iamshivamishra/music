import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { serviceJobService } from "@/lib/services/service-job.service";
import { toServiceJobDto } from "@/lib/serializers/service-job";
import { formatErrorResponse, ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { parseServiceJobListQuery } from "@/lib/validators/service-job";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role !== "admin") throw new ForbiddenError("Admin access required");

    const parsed = parseServiceJobListQuery(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const result = await serviceJobService.listDisputed(parsed.page, parsed.limit);
    return Response.json({
      ...result,
      data: result.data.map(toServiceJobDto),
    });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
