import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { cartService } from "@/lib/services/cart.service";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { updatePackTierSchema as updateTierSchema } from "@/lib/validators/cart";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

type RouteContext = { params: Promise<{ packId: string }> };

export async function PATCH(
  request: NextRequest,
  context: RouteContext
) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 60, windowSec: 60, prefix: "cart" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { packId } = await context.params;
    const body = await request.json();
    const { packTier } = updateTierSchema.parse(body);

    await cartService.updatePackTier(session.user.id, packId, packTier);
    return Response.json({ message: "Pack tier updated" });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext
) {
  try {
    const ip = getClientIp(_request);
    const rl = await rateLimit(ip, { limit: 60, windowSec: 60, prefix: "cart" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { packId } = await context.params;
    await cartService.removePackItem(session.user.id, packId);

    return Response.json({ message: "Pack removed from cart" });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
