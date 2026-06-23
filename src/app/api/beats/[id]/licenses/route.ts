import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { licenseService } from "@/lib/services/license.service";
import { createLicenseSchema } from "@/lib/validators/license";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const licenses = await licenseService.getForBeat(id);
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
