import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { formatErrorResponse } from "@/lib/errors";
import { likeService } from "@/lib/services/like.service";
import { objectIdSchema } from "@/lib/validators/params";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: Params) {
  try {
    const ip = getClientIp(_request);
    const rl = await rateLimit(ip, { limit: 30, windowSec: 60, prefix: "beat-like" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const { id } = await params;
    objectIdSchema.parse(id);
    const session = await auth();
    const state = await likeService.getLikeState(id, session?.user?.id);

    return Response.json(state);
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const ip = getClientIp(_request);
    const rl = await rateLimit(ip, { limit: 30, windowSec: 60, prefix: "beat-like" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const { id } = await params;
    objectIdSchema.parse(id);
    const session = await auth();
    const state = await likeService.toggleLike(
      {
        userId: session?.user?.id,
        role: session?.user?.role,
      },
      id
    );

    return Response.json(state);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
