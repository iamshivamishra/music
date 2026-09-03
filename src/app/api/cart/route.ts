import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { cartService } from "@/lib/services/cart.service";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { addToCartSchema } from "@/lib/validators/cart";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { resolveUnlistedAccessToken } from "@/lib/unlisted-token";

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 60, windowSec: 60, prefix: "cart" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const [items, packItems] = await Promise.all([
      cartService.getItems(session.user.id),
      cartService.getPackItems(session.user.id),
    ]);
    const total =
      items.reduce((sum, i) => sum + i.price, 0) +
      packItems.reduce((sum, i) => sum + i.price, 0);

    return Response.json({
      items,
      packItems,
      total,
      count: items.length + packItems.length,
    });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 60, windowSec: 60, prefix: "cart" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const body = await request.json();
    const { beatId, licenseId, accessToken } = addToCartSchema.parse(body);
    const token = await resolveUnlistedAccessToken({
      beatId,
      bodyToken: accessToken,
    });

    await cartService.addItem(session.user.id, beatId, licenseId, token);
    const count = await cartService.getCount(session.user.id);

    return Response.json({ message: "Added to cart", count }, { status: 201 });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 60, windowSec: 60, prefix: "cart" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    await cartService.clearCart(session.user.id);
    return Response.json({ message: "Cart cleared" });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
