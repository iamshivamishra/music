import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { requireProducer } from "@/lib/auth/role-checks";
import { crmService } from "@/lib/services/crm.service";
import { customerKeySchema } from "@/lib/validators/crm";
import { formatErrorResponse } from "@/lib/errors";

interface RouteParams {
  params: Promise<{ key: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    requireProducer(session);

    const { key } = await params;
    const customerKey = customerKeySchema.parse(decodeURIComponent(key));
    const result = await crmService.getCustomer(session.user.id, customerKey);
    return Response.json(result);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
