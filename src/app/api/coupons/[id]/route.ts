import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { couponService } from "@/lib/services/coupon.service";
import { formatErrorResponse } from "@/lib/errors";
import { requireProducer } from "@/lib/auth/role-checks";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { updateCouponSchema } from "@/lib/validators/coupon";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 20, windowSec: 60, prefix: "coupon-update" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    requireProducer(session);

    const { id } = await params;
    const input = updateCouponSchema.parse(await request.json());
    const coupon = await couponService.update(id, session.user.id, input);

    return Response.json(coupon);
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 10, windowSec: 60, prefix: "coupon-delete" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    requireProducer(session);

    const { id } = await params;
    await couponService.delete(id, session.user.id);

    return Response.json({ success: true });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
