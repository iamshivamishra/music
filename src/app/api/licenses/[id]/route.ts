import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { licenseService } from "@/lib/services/license.service";
import { updateLicenseSchema } from "@/lib/validators/license";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { objectIdSchema } from "@/lib/validators/params";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(_request);
    const { success, resetAt } = await rateLimit(ip, { limit: 60, windowSec: 60, prefix: "license-detail" });
    if (!success) return rateLimitResponse(resetAt);

    const { id } = await params;
    objectIdSchema.parse(id);
    const license = await licenseService.getById(id);
    return Response.json({ license });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { id } = await params;
    objectIdSchema.parse(id);
    const body = await request.json();
    const input = updateLicenseSchema.parse(body);

    const license = await licenseService.update(
      id,
      input,
      session.user.id,
      session.user.role
    );

    return Response.json({ license });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { id } = await params;
    objectIdSchema.parse(id);
    await licenseService.delete(id, session.user.id, session.user.role);

    return Response.json({ message: "License deleted" });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
