import { auth } from "@/lib/auth";
import { purchaseService } from "@/lib/services/purchase.service";
import { formatErrorResponse, UnauthorizedError, ValidationError } from "@/lib/errors";
import { NextRequest } from "next/server";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await rateLimit(ip, { limit: 10, windowSec: 60, prefix: "user-verify-license" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const purchaseId = req.nextUrl.searchParams.get("purchaseId");
    if (!purchaseId) {
      throw new ValidationError("Missing purchase ID", {
        purchaseId: ["Purchase ID is required"],
      });
    }

    const certificate = await purchaseService.verifyLicense(purchaseId, session.user.id);

    return Response.json(certificate);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
