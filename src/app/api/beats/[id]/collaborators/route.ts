import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { collabService } from "@/lib/services/collab.service";
import {
  setBeatSplitsSchema,
  updateCollabSettingsSchema,
} from "@/lib/validators/collab";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { objectIdSchema } from "@/lib/validators/params";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { id } = await params;
    objectIdSchema.parse(id);
    const splits = await collabService.getBeatSplits(id, session.user.id, session.user.role);
    return Response.json(splits);
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 20, windowSec: 3600, prefix: "collab-invite" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { id } = await params;
    objectIdSchema.parse(id);
    const input = setBeatSplitsSchema.parse(await request.json());
    const splits = await collabService.setSplits(
      id,
      session.user.id,
      session.user.role,
      input
    );
    return Response.json(splits, { status: 201 });
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
    const input = updateCollabSettingsSchema.parse(await request.json());
    const splits = await collabService.updateSettings(
      id,
      session.user.id,
      session.user.role,
      input
    );
    return Response.json(splits);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
