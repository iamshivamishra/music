import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { licenseService } from "@/lib/services/license.service";
import { createLicenseSchema } from "@/lib/validators/license";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { resolveUnlistedAccessToken } from "@/lib/unlisted-token";
import { objectIdSchema } from "@/lib/validators/params";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(_request);
    const { success, resetAt } = await rateLimit(ip, { limit: 60, windowSec: 60, prefix: "beat-licenses" });
    if (!success) return rateLimitResponse(resetAt);

    const { id } = await params;
    objectIdSchema.parse(id);
    const session = await auth();
    const accessToken = await resolveUnlistedAccessToken({
      beatId: id,
      queryToken: _request.nextUrl.searchParams.get("t"),
    });
    const licenses = await licenseService.getForBeat(id, true, {
      userId: session?.user?.id,
      userRole: session?.user?.role,
      accessToken,
    });
    return Response.json({ licenses });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { id } = await params;
    objectIdSchema.parse(id);
    const body = await request.json();

    if (body.resetDefaults) {
      const licenses = await licenseService.resetToDefaults(
        id,
        session.user.id,
        session.user.role
      );
      return Response.json({ licenses });
    }

    const input = createLicenseSchema.parse({ ...body, beatId: id });
    const license = await licenseService.create(input, session.user.id, session.user.role);
    return Response.json({ license }, { status: 201 });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
