import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { beatService } from "@/lib/services/beat.service";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { formatErrorResponse, ForbiddenError, UnauthorizedError } from "@/lib/errors";
import type { BeatStatus } from "@/types";

export async function GET(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role !== "producer" && session.user.role !== "admin") {
      throw new ForbiddenError("Only producers can access this");
    }

    const searchParams = request.nextUrl.searchParams;
    const status = (searchParams.get("status") || undefined) as BeatStatus | undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const [result, stats, earnings] = await Promise.all([
      beatService.listByProducer(session.user.id, status, page, limit),
      beatService.getProducerStats(session.user.id),
      purchaseRepository.getEarningsByProducer(session.user.id),
    ]);

    return Response.json({ ...result, stats, earnings });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
