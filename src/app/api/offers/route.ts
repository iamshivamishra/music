import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { offerService } from "@/lib/services/offer.service";
import { createOfferSchema, listOffersQuerySchema } from "@/lib/validators/offer";
import { formatErrorResponse, ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role !== "producer" && session.user.role !== "admin") {
      throw new ForbiddenError("Only producers can list offers");
    }

    const query = listOffersQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const result = await offerService.list(session.user.id, query.tab, query.page, query.limit);
    return Response.json(result);
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 10, windowSec: 60, prefix: "offer-create" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role !== "producer" && session.user.role !== "admin") {
      throw new ForbiddenError("Only producers can create offers");
    }

    const input = createOfferSchema.parse(await request.json());
    const offer = await offerService.createOffer(session.user.id, input);
    return Response.json(offer, { status: 201 });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
