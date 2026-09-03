import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { storageService } from "@/lib/services/storage.service";
import { formatErrorResponse, ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { requireProducer } from "@/lib/auth/role-checks";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { beatPresignSchema, beatPresignReplaceSchema, profilePresignSchema } from "@/lib/validators/storage";

/**
 * POST /api/upload/presign
 *
 * Body: { producerId, beatId, category, contentType, fileSize }
 *   OR  { category: "avatar"|"cover", contentType, fileSize }
 *
 * Returns: { uploadUrl, publicUrl, key } — client PUTs the file to uploadUrl.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 20, windowSec: 60, prefix: "upload" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const body = await request.json();

    if (body.category === "avatar" || body.category === "cover") {
      const input = profilePresignSchema.parse(body);
      const result = await storageService.getPresignedProfileUploadUrl(
        session.user.id,
        input.category,
        input.contentType,
        input.fileSize
      );
      return Response.json(result);
    }

    requireProducer(session);

    const input = beatPresignReplaceSchema.parse(body);
    const targetProducerId = input.producerId ?? session.user.id;

    if (targetProducerId !== session.user.id && session.user.role !== "admin") {
      throw new ForbiddenError("You can only upload files for your own beats");
    }

    const result = await storageService.getPresignedUploadUrl(
      targetProducerId,
      input.beatId,
      input.category,
      input.contentType,
      input.fileSize
    );

    return Response.json(result);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
