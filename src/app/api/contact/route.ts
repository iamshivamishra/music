import { NextRequest } from "next/server";
import { contactSchema } from "@/lib/validators/contact";
import { emailService } from "@/lib/services/email.service";
import { formatErrorResponse } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    const rl = await rateLimit(ip, {
      limit: 3,
      windowSec: 300,
      prefix: "contact",
    });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const body = await request.json();
    const input = contactSchema.parse(body);

    await emailService.sendContactNotification(input);

    return Response.json({ success: true });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
