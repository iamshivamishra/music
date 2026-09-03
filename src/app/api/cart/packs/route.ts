import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { cartService } from "@/lib/services/cart.service";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { addPackToCartSchema as addPackSchema } from "@/lib/validators/cart";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 60, windowSec: 60, prefix: "cart" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const body = await request.json();
    const { packId, packTier } = addPackSchema.parse(body);

    await cartService.addPackItem(session.user.id, packId, packTier);
    const count = await cartService.getCount(session.user.id);

    return Response.json({ message: "Pack added to cart", count }, { status: 201 });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
