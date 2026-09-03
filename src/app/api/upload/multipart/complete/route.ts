import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { storageService } from "@/lib/services/storage.service";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { multipartCompleteSchema } from "@/lib/validators/storage";

/**
 * POST /api/upload/multipart/complete
 *
 * Completes a multipart upload after all parts have been uploaded.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 20, windowSec: 60, prefix: "multipart-complete" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const input = multipartCompleteSchema.parse(await request.json());

    await storageService.completeMultipartUpload(
      input.key,
      input.uploadId,
      input.parts
    );

    return Response.json({ success: true });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
