import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { beatService } from "@/lib/services/beat.service";
import { toPublicBeatPayload } from "@/lib/serializers/beat";
import { updateBeatSchema } from "@/lib/validators/beat";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { objectIdSchema } from "@/lib/validators/params";
import { resolveUnlistedAccessToken } from "@/lib/unlisted-token";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const { success, resetAt } = await rateLimit(ip, { limit: 60, windowSec: 60, prefix: "beat-detail" });
    if (!success) return rateLimitResponse(resetAt);

    const { id } = await params;
    objectIdSchema.parse(id);

    if (request.nextUrl.searchParams.get("t")) {
      const tokenRl = await rateLimit(ip, {
        limit: 20,
        windowSec: 60,
        prefix: "unlisted-token",
      });
      if (!tokenRl.success) return rateLimitResponse(tokenRl.resetAt);
    }
    const session = await auth();
    const accessToken = await resolveUnlistedAccessToken({
      beatId: id,
      queryToken: request.nextUrl.searchParams.get("t"),
    });

    const { beat, licenses, hasPurchased } = await beatService.getPublicDetail(
      id,
      session?.user?.id,
      session?.user?.role,
      accessToken
    );

    return Response.json({ beat: toPublicBeatPayload(beat), licenses, hasPurchased });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { id } = await params;
    objectIdSchema.parse(id);
    const body = await request.json();
    const input = updateBeatSchema.parse(body);

    const beat = await beatService.update(id, session.user.id, session.user.role, input);

    return Response.json({ beat });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { id } = await params;
    objectIdSchema.parse(id);
    await beatService.delete(id, session.user.id, session.user.role);

    return Response.json({ message: "Beat deleted" });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
