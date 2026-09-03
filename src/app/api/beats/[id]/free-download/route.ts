import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { leadService } from "@/lib/services/lead.service";
import { captureLeadSchema } from "@/lib/validators/lead";
import { formatErrorResponse } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const ip = getClientIp(request);
    const ipLimit = await rateLimit(ip, {
      limit: 10,
      windowSec: 3600,
      prefix: "free-download-ip",
    });
    if (!ipLimit.success) return rateLimitResponse(ipLimit.resetAt);

    const { id } = await params;
    const input = captureLeadSchema.parse(await request.json());

    const identity = input.email || input.whatsappNumber || "anon";
    const identityLimit = await rateLimit(`${ip}:${identity}`, {
      limit: 5,
      windowSec: 3600,
      prefix: "free-download",
    });
    if (!identityLimit.success) return rateLimitResponse(identityLimit.resetAt);

    const session = await auth();
    const result = await leadService.captureAndGrant(id, input, {
      userId: session?.user?.id,
    });

    return Response.json(result);
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export const runtime = "nodejs";
