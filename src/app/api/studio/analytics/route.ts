import { auth } from "@/lib/auth";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { beatService } from "@/lib/services/beat.service";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { formatErrorResponse, ForbiddenError, UnauthorizedError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role !== "producer" && session.user.role !== "admin") {
      throw new ForbiddenError("Only producers can access analytics");
    }

    const producerId = session.user.id;

    const [
      totalEarnings,
      totalSales,
      stats,
      monthlyData,
      topBeats,
      totalPlays,
    ] = await Promise.all([
      purchaseRepository.getEarningsByProducer(producerId),
      purchaseRepository.countByProducer(producerId),
      beatService.getProducerStats(producerId),
      purchaseRepository.getMonthlyRevenue(producerId, 12),
      purchaseRepository.getTopBeats(producerId, 5),
      beatRepository
        .findByProducerId(producerId, true)
        .then((beats) => beats.reduce((sum, b) => sum + b.plays, 0)),
    ]);

    return Response.json({
      totalEarnings,
      totalSales,
      totalPlays,
      beats: stats,
      monthlyData,
      topBeats,
    });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
