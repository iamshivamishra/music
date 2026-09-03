import { auth } from "@/lib/auth";
import { collabService } from "@/lib/services/collab.service";
import { formatErrorResponse, ForbiddenError, UnauthorizedError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role !== "producer" && session.user.role !== "admin") {
      throw new ForbiddenError("Only producers can view collab invites");
    }

    const result = await collabService.listForUser(session.user.id);
    return Response.json(result);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
