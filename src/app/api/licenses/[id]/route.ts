import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { licenseService } from "@/lib/services/license.service";
import { updateLicenseSchema } from "@/lib/validators/license";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
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
    await licenseService.delete(id, session.user.id, session.user.role);

    return Response.json({ message: "License deleted" });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
