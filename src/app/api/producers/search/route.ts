import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { producerService } from "@/lib/services/producer.service";
import { producerSearchSchema } from "@/lib/validators/producer";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 30, windowSec: 60, prefix: "producer-search" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { q } = producerSearchSchema.parse({
      q: request.nextUrl.searchParams.get("q") ?? "",
    });
    const data = await producerService.searchByUsername(q, session.user.id);
    return Response.json({ data });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
