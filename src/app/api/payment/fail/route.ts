import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { paymentService } from "@/lib/services/payment.service";
import { failOrderSchema } from "@/lib/validators/payment";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const body = await request.json();
    const { orderId, reason } = failOrderSchema.parse(body);

    await paymentService.markFailed(orderId, session.user.id, reason);

    return Response.json({ message: "Order marked as failed" });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
