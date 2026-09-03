import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { beatService } from "@/lib/services/beat.service";
import { beatFilterSchema } from "@/lib/validators/beat";
import { formatErrorResponse } from "@/lib/errors";
import { requireProducer } from "@/lib/auth/role-checks";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { success, resetAt } = await rateLimit(ip, { limit: 60, windowSec: 60, prefix: "beats-list" });
    if (!success) return rateLimitResponse(resetAt);

    const params = Object.fromEntries(request.nextUrl.searchParams);
    const filters = beatFilterSchema.parse(params);
    const result = await beatService.list(filters);

    return Response.json(result);
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    requireProducer(session);

    const contentType = request.headers.get("content-type") || "";
    const isJsonPayload = contentType.includes("application/json");

    const beat = isJsonPayload
      ? await beatService.createFromJsonUpload(await request.json(), session.user.id)
      : await beatService.createFromFormData(await request.formData(), session.user.id);

    return Response.json(
      { beat },
      {
        status: 201,
      }
    );
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export const runtime = "nodejs";
