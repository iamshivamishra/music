import { NextRequest } from "next/server";
import { joinWaitlistSchema } from "@/lib/validators/waitlist";
import { waitlistService } from "@/lib/services/waitlist.service";
import { formatErrorResponse } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    const rl = await rateLimit(ip, {
      limit: 5,
      windowSec: 300,
      prefix: "waitlist",
    });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const body = await request.json();
    const input = joinWaitlistSchema.parse(body);

    const entry = await waitlistService.join(input);

    return Response.json(
      { message: "You've been added to the waitlist!", id: entry._id },
      { status: 201 }
    );
  } catch (error) {
    return formatErrorResponse(error);
  }
}
