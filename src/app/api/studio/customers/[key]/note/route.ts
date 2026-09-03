import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { requireProducer } from "@/lib/auth/role-checks";
import { crmService } from "@/lib/services/crm.service";
import { customerKeySchema, upsertCustomerNoteSchema } from "@/lib/validators/crm";
import { formatErrorResponse } from "@/lib/errors";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";

interface RouteParams {
  params: Promise<{ key: string }>;
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    requireProducer(session);

    const rl = await rateLimit(session.user.id, {
      limit: 20,
      windowSec: 60,
      prefix: "crm-note",
    });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const { key } = await params;
    const customerKey = customerKeySchema.parse(decodeURIComponent(key));
    const { note } = upsertCustomerNoteSchema.parse(await request.json());
    const result = await crmService.upsertNote(session.user.id, customerKey, note);
    return Response.json(result);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
