import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { formatErrorResponse, ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { rateLimit, rateLimitResponse } from "@/lib/rate-limit";
import { taxService } from "@/lib/services/tax.service";
import { currentIstYearMonth } from "@/lib/utils/ist";
import { taxExportQuerySchema } from "@/lib/validators/tax";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role !== "producer" && session.user.role !== "admin") {
      throw new ForbiddenError("Only producers can access tax exports");
    }

    const current = currentIstYearMonth();
    const input = taxExportQuerySchema.parse({
      year: request.nextUrl.searchParams.get("year") ?? current.year,
      month: request.nextUrl.searchParams.get("month") ?? current.month,
      format: request.nextUrl.searchParams.get("format") ?? "json",
    });

    if (input.format === "json") {
      const summary = await taxService.getMonthSummary(session.user.id, input.year, input.month);
      return Response.json(summary);
    }

    const rl = await rateLimit(session.user.id, {
      limit: 10,
      windowSec: 86400,
      prefix: "tax-export",
    });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const exported = await taxService.buildExport(
      session.user.id,
      input.year,
      input.month,
      input.format
    );

    return new NextResponse(new Uint8Array(exported.body), {
      headers: {
        "Content-Type": exported.contentType,
        "Content-Disposition": `attachment; filename="${exported.filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
