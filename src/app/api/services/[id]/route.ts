import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { serviceListingService } from "@/lib/services/service-listing.service";
import { toStudioServiceListing } from "@/lib/serializers/service-listing";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { updateServiceListingSchema } from "@/lib/validators/service-listing";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { id } = await params;
    const listing = await serviceListingService.getForOwner(id, session.user.id);
    return Response.json(toStudioServiceListing(listing));
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 20, windowSec: 60, prefix: "service-listing-update" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { id } = await params;
    const input = updateServiceListingSchema.parse(await request.json());
    const listing = await serviceListingService.update(
      id,
      session.user.id,
      session.user.role,
      input
    );

    return Response.json(toStudioServiceListing(listing));
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 10, windowSec: 60, prefix: "service-listing-delete" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { id } = await params;
    await serviceListingService.delete(id, session.user.id, session.user.role);
    return Response.json({ success: true });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
