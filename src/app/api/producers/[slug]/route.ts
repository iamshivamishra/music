import { NextRequest } from "next/server";
import { producerService } from "@/lib/services/producer.service";
import { formatErrorResponse, NotFoundError } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { slugSchema } from "@/lib/validators/params";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const ip = getClientIp(_request);
    const { success, resetAt } = await rateLimit(ip, { limit: 60, windowSec: 60, prefix: "producer-detail" });
    if (!success) return rateLimitResponse(resetAt);

    const { slug } = await params;
    const validatedSlug = slugSchema.parse(slug);
    const data = await producerService.getPublicBySlug(validatedSlug);
    if (!data) throw new NotFoundError("Producer");

    return Response.json(data);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
