import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requireProducer } from "@/lib/auth/role-checks";
import { leadService } from "@/lib/services/lead.service";
import { exportLeadsQuerySchema } from "@/lib/validators/lead";
import { formatErrorResponse } from "@/lib/errors";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    requireProducer(session);

    const query = exportLeadsQuerySchema.parse(
      Object.fromEntries(request.nextUrl.searchParams)
    );
    const csv = await leadService.exportCsv(session.user.id, query);

    return new NextResponse(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="leads.csv"',
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
