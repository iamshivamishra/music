import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { followService } from "@/lib/services/follow.service";
import { objectIdSchema } from "@/lib/validators/params";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function POST(_req: NextRequest, { params }: Params) {
  try {
    const ip = getClientIp(_req);
    const rl = await rateLimit(ip, { limit: 20, windowSec: 60, prefix: "follow" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { slug: producerId } = await params;
    objectIdSchema.parse(producerId);
    const result = await followService.follow(session.user.id, producerId);
    return Response.json({ success: true, following: result.following });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const ip = getClientIp(_req);
    const rl = await rateLimit(ip, { limit: 20, windowSec: 60, prefix: "follow" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { slug: producerId } = await params;
    objectIdSchema.parse(producerId);
    const result = await followService.unfollow(session.user.id, producerId);
    return Response.json({ success: true, following: result.following });
  } catch (error) {
    return formatErrorResponse(error);
  }
}