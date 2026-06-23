import { NextRequest } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { beatService } from "@/lib/services/beat.service";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";

const statusSchema = z.object({
  status: z.enum(["draft", "published", "archived"]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { id } = await params;
    const body = await request.json();
    const { status } = statusSchema.parse(body);

    let beat;
    switch (status) {
      case "published":
        beat = await beatService.publish(id, session.user.id, session.user.role);
        break;
      case "draft":
        beat = await beatService.unpublish(id, session.user.id, session.user.role);
        break;
      case "archived":
        beat = await beatService.archive(id, session.user.id, session.user.role);
        break;
    }

    return Response.json({ beat });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
