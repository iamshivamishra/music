import { NextRequest } from "next/server";
import { z } from "zod";
import { beatService } from "@/lib/services/beat.service";
import { formatErrorResponse } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { writeUnlistedToken } from "@/lib/unlisted-token";
import { objectIdSchema } from "@/lib/validators/params";

const unlockSchema = z.object({
  token: z.string().min(1),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, {
      limit: 20,
      windowSec: 60,
      prefix: "unlisted-unlock",
    });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const { id } = await params;
    objectIdSchema.parse(id);
    const body = await request.json();
    const { token } = unlockSchema.parse(body);

    await beatService.unlockUnlisted(id, token);
    await writeUnlistedToken(id, token);

    return new Response(null, { status: 204 });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
