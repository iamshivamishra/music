import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { cartService } from "@/lib/services/cart.service";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { updateCartLicenseSchema as updateSchema } from "@/lib/validators/cart";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ beatId: string }> }
) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 60, windowSec: 60, prefix: "cart" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { beatId } = await params;
    const body = await request.json();
    const { licenseId } = updateSchema.parse(body);

    await cartService.updateLicense(session.user.id, beatId, licenseId);
    return Response.json({ message: "License updated" });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ beatId: string }> }
) {
  try {
    const ip = getClientIp(_request);
    const rl = await rateLimit(ip, { limit: 60, windowSec: 60, prefix: "cart" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { beatId } = await params;
    await cartService.removeItem(session.user.id, beatId);

    const count = await cartService.getCount(session.user.id);
    return Response.json({ message: "Removed from cart", count });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
