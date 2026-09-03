import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { beatService } from "@/lib/services/beat.service";
import { beatStatusActionSchema } from "@/lib/validators/beat";
import { objectIdSchema } from "@/lib/validators/params";
import { formatErrorResponse, UnauthorizedError, ValidationError } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 10, windowSec: 60, prefix: "beat-status" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { id } = await params;
    objectIdSchema.parse(id);
    const body = await request.json();
    const input = beatStatusActionSchema.parse(body);
    const { user } = session;

    if (input.rotateToken) {
      const beat = await beatService.rotatePrivateToken(id, user.id, user.role);
      return Response.json({ beat });
    }

    if (!input.status) {
      throw new ValidationError("Status is required");
    }

    let beat;
    switch (input.status) {
      case "published":
        beat = await beatService.publish(id, user.id, user.role);
        break;
      case "draft":
        beat = await beatService.unpublish(id, user.id, user.role);
        break;
      case "archived":
        beat = await beatService.archive(id, user.id, user.role);
        break;
      case "unlisted":
        beat = await beatService.unlist(id, user.id, user.role, input.publishAt);
        break;
      case "scheduled":
        if (!input.publishAt) {
          throw new ValidationError("Publish date is required when scheduling a beat");
        }
        beat = await beatService.schedule(id, user.id, user.role, input.publishAt);
        break;
    }

    return Response.json({ beat });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
