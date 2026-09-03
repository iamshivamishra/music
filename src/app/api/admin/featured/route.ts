import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { featuredService } from "@/lib/services/featured.service";
import { formatErrorResponse } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth/role-checks";
import { createFeaturedBeatSchema } from "@/lib/validators/featured";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(_request: NextRequest) {
  try {
    const ip = getClientIp(_request);
    const rl = await rateLimit(ip, { limit: 30, windowSec: 60, prefix: "admin-featured" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    requireAdmin(session);

    const entries = await featuredService.listWithBeatTitles();
    return Response.json({ data: entries });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 30, windowSec: 60, prefix: "admin-featured" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    requireAdmin(session);

    const body = await request.json();
    const parsed = createFeaturedBeatSchema.parse(body);

    const entry = await featuredService.create(
      {
        beatId: parsed.beatId,
        section: parsed.section,
        position: parsed.position,
        startDate: parsed.startDate,
        endDate: parsed.endDate,
      },
      session.user.id,
    );

    return Response.json({ data: entry }, { status: 201 });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
