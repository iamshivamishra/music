import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { requireProducer } from "@/lib/auth/role-checks";
import { leadService } from "@/lib/services/lead.service";
import { listLeadsQuerySchema } from "@/lib/validators/lead";
import { formatErrorResponse } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    requireProducer(session);

    const query = listLeadsQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const result = await leadService.listForProducer(session.user.id, query);

    return Response.json(result);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
