import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { requireProducer } from "@/lib/auth/role-checks";
import { crmService } from "@/lib/services/crm.service";
import { listCustomersQuerySchema } from "@/lib/validators/crm";
import { formatErrorResponse } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    requireProducer(session);

    const query = listCustomersQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const result = await crmService.listCustomers(session.user.id, query);
    return Response.json(result);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
