import { auth } from "@/lib/auth";
import { purchaseService } from "@/lib/services/purchase.service";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { NextRequest } from "next/server";
import type { OrderStatus } from "@/types";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

const VALID_STATUSES = new Set<OrderStatus>(["pending", "paid", "failed", "refunded"]);

export async function GET(req: NextRequest) {
  try {
    const ip = getClientIp(req);
    const rl = await rateLimit(ip, { limit: 30, windowSec: 60, prefix: "user-transactions" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const params = req.nextUrl.searchParams;
    const page = Math.max(1, parseInt(params.get("page") ?? "1", 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(params.get("limit") ?? "12", 10) || 12));
    const statusParam = params.get("status") as OrderStatus | null;
    const status = statusParam && VALID_STATUSES.has(statusParam) ? statusParam : undefined;

    const result = await purchaseService.getTransactionsPaginated(
      session.user.id,
      page,
      limit,
      status
    );

    return Response.json(result);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
