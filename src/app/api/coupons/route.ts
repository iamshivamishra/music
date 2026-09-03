import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { couponService } from "@/lib/services/coupon.service";
import { formatErrorResponse } from "@/lib/errors";
import { requireProducer } from "@/lib/auth/role-checks";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { createCouponSchema } from "@/lib/validators/coupon";
import type { CouponStatus } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    requireProducer(session);

    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status") as CouponStatus | null;
    const page = Math.max(1, Number(searchParams.get("page")) || 1);
    const limit = Math.min(50, Math.max(1, Number(searchParams.get("limit")) || 20));

    const result = await couponService.list(
      session.user.id,
      status ?? undefined,
      page,
      limit
    );

    return Response.json(result);
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 10, windowSec: 60, prefix: "coupon-create" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    requireProducer(session);

    const input = createCouponSchema.parse(await request.json());
    const coupon = await couponService.create(session.user.id, input);

    return Response.json(coupon, { status: 201 });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
