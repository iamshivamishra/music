import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { receiptService } from "@/lib/services/receipt.service";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { objectIdSchema } from "@/lib/validators/params";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const ip = getClientIp(_request);
    const rl = await rateLimit(ip, { limit: 10, windowSec: 60, prefix: "order-receipt" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const { id } = await params;
    objectIdSchema.parse(id);
    const { buffer, filename } = await receiptService.generateForBuyer(id, session.user.id);

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
