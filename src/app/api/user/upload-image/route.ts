import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { storageService } from "@/lib/services/storage.service";
import { authService } from "@/lib/services/auth.service";
import { formatErrorResponse, UnauthorizedError, ValidationError } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 5, windowSec: 60, prefix: "upload-image" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string;

    if (!file || file.size === 0) {
      throw new ValidationError("Validation failed", {
        file: ["No file provided"],
      });
    }

    if (type !== "avatar" && type !== "cover") {
      throw new ValidationError("Validation failed", {
        type: ["Type must be 'avatar' or 'cover'"],
      });
    }

    const result = await storageService.uploadProfileImage(
      file,
      session.user.id,
      type
    );

    await authService.updateProfileImage(session.user.id, type, result.url);

    return Response.json({ url: result.url });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export const runtime = "nodejs";
