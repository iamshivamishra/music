import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { couponService } from "@/lib/services/coupon.service";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { validateCouponSchema } from "@/lib/validators/coupon";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 15, windowSec: 60, prefix: "coupon-validate" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const input = validateCouponSchema.parse(await request.json());
    const result = await couponService.validateFromCart(
      input.code,
      session.user.id,
      session.user.email ?? "",
      input.packIds,
      input.tiers
    );

    return Response.json({
      valid: true,
      code: result.coupon.code,
      discountType: result.coupon.type,
      discountValue: result.coupon.value,
      discountPerPack: result.discountPerPack,
      totalDiscount: result.totalDiscount,
    });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
