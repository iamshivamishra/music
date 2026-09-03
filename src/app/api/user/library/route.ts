import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { libraryService } from "@/lib/services/library.service";
import { libraryQuerySchema } from "@/lib/validators/library";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 30, windowSec: 60, prefix: "library" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const params = Object.fromEntries(request.nextUrl.searchParams);
    const { page, limit, search } = libraryQuerySchema.parse(params);
    const result = await libraryService.getLibrary(
      session.user.id,
      page,
      limit,
      search
    );

    return Response.json(result);
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export const runtime = "nodejs";
