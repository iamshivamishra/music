import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { collabService } from "@/lib/services/collab.service";
import { collabRespondSchema } from "@/lib/validators/collab";
import { formatErrorResponse, ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { objectIdSchema } from "@/lib/validators/params";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ beatId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role !== "producer" && session.user.role !== "admin") {
      throw new ForbiddenError("Only producers can respond to collab invites");
    }

    const { beatId } = await params;
    objectIdSchema.parse(beatId);
    const { action } = collabRespondSchema.parse(await request.json());
    const splits = await collabService.respond(beatId, session.user.id, action);
    return Response.json(splits);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
