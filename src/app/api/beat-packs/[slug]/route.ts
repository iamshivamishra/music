import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { packService } from "@/lib/services/pack.service";
import { updatePackSchema } from "@/lib/validators/pack";
import { formatErrorResponse } from "@/lib/errors";
import { requireProducer } from "@/lib/auth/role-checks";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { slugSchema } from "@/lib/validators/params";

type RouteContext = { params: Promise<{ slug: string }> };

export async function GET(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const ip = getClientIp(_request);
    const { success, resetAt } = await rateLimit(ip, { limit: 60, windowSec: 60, prefix: "pack-detail" });
    if (!success) return rateLimitResponse(resetAt);

    const { slug } = await context.params;
    slugSchema.parse(slug);
    const pack = await packService.getBySlug(slug);
    return Response.json({ pack });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();
    requireProducer(session);

    const { slug } = await context.params;
    slugSchema.parse(slug);
    const pack = await packService.getBySlug(slug);

    const body = await request.json();
    const input = updatePackSchema.parse(body);
    const updated = await packService.update(
      pack._id.toString(),
      session.user.id,
      session.user.role,
      input
    );

    return Response.json({ pack: updated });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const session = await auth();
    requireProducer(session);

    const { slug } = await context.params;
    slugSchema.parse(slug);
    const pack = await packService.getBySlug(slug);
    await packService.delete(pack._id.toString(), session.user.id, session.user.role);

    return Response.json({ message: "Pack deleted" });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export const runtime = "nodejs";
