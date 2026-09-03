import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { pdfService } from "@/lib/services/pdf.service";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { objectIdSchema } from "@/lib/validators/params";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(_request);
    const rl = await rateLimit(ip, { limit: 10, windowSec: 60, prefix: "license-pdf" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { id } = await params;
    objectIdSchema.parse(id);
    const url = await pdfService.getLicensePdfUrl(id, session.user.id);

    return Response.redirect(url, 302);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
