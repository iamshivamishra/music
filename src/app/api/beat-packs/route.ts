import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { packService } from "@/lib/services/pack.service";
import { createPackSchema, packFilterSchema } from "@/lib/validators/pack";
import { formatErrorResponse } from "@/lib/errors";
import { requireProducer } from "@/lib/auth/role-checks";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const { success, resetAt } = await rateLimit(ip, { limit: 60, windowSec: 60, prefix: "packs-list" });
    if (!success) return rateLimitResponse(resetAt);

    const params = Object.fromEntries(request.nextUrl.searchParams);
    const filters = packFilterSchema.parse(params);
    const result = await packService.list(filters);

    return Response.json(result);
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    requireProducer(session);

    const body = await request.json();
    const input = createPackSchema.parse(body);
    const pack = await packService.create(input, session.user.id);

    return Response.json({ pack }, { status: 201 });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export const runtime = "nodejs";
