import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { serviceListingService } from "@/lib/services/service-listing.service";
import { toStudioServiceListing } from "@/lib/serializers/service-listing";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import {
  createServiceListingSchema,
  parseServiceListingListQuery,
} from "@/lib/validators/service-listing";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const parsed = parseServiceListingListQuery(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const result = await serviceListingService.list(
      session.user.id,
      parsed.status,
      parsed.page,
      parsed.limit
    );
    return Response.json({
      ...result,
      data: result.data.map(toStudioServiceListing),
    });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 10, windowSec: 60, prefix: "service-listing-create" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const input = createServiceListingSchema.parse(await request.json());
    const listing = await serviceListingService.create(
      session.user.id,
      session.user.role,
      input
    );

    return Response.json(toStudioServiceListing(listing), { status: 201 });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
