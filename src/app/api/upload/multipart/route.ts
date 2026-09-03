import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { storageService } from "@/lib/services/storage.service";
import { formatErrorResponse, ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { requireProducer } from "@/lib/auth/role-checks";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { multipartInitSchema } from "@/lib/validators/storage";

/**
 * POST /api/upload/multipart
 *
 * Initiates a multipart upload for large files (WAV/ZIP).
 * Returns uploadId, key, publicUrl, and presigned URLs for each part.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 10, windowSec: 60, prefix: "multipart" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    requireProducer(session);

    const input = multipartInitSchema.parse(await request.json());
    const targetProducerId = input.producerId ?? session.user.id;

    if (targetProducerId !== session.user.id && session.user.role !== "admin") {
      throw new ForbiddenError("You can only upload files for your own beats");
    }

    const result = await storageService.initiateMultipartUpload(
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
