import { auth } from "@/lib/auth";
import { paymentService } from "@/lib/services/payment.service";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const purchasedBeatIds = await paymentService.getPurchasedBeatIds(session.user.id);

    return Response.json({ purchasedBeatIds });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
