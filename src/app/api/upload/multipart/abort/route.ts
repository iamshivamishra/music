import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { storageService } from "@/lib/services/storage.service";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { multipartAbortSchema } from "@/lib/validators/storage";

/**
 * POST /api/upload/multipart/abort
 *
 * Aborts a multipart upload, cleaning up any uploaded parts.
 */
export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 20, windowSec: 60, prefix: "multipart-abort" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const input = multipartAbortSchema.parse(await request.json());

    await storageService.abortMultipartUpload(input.key, input.uploadId);

    return Response.json({ success: true });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
