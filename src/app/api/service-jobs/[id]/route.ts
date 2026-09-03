import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { serviceJobService } from "@/lib/services/service-job.service";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    const { id } = await params;
    const job = await serviceJobService.getDetailForUser(
      id,
      session.user.id,
      session.user.role === "admin"
    );
    return Response.json(job);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
