import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { offerCheckoutService } from "@/lib/services/offer-checkout.service";
import { offerCheckoutSchema } from "@/lib/validators/offer";
import { attributionFromCookies } from "@/lib/attribution";
import { formatErrorResponse, ValidationError } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const ip = getClientIp(request);
    const rl = session?.user
      ? await rateLimit(ip, { limit: 10, windowSec: 60, prefix: "payment" })
      : await rateLimit(ip, { limit: 5, windowSec: 3600, prefix: "offer-guest-order" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const input = offerCheckoutSchema.parse(await request.json());
    const attribution = attributionFromCookies(request.cookies);

    if (session?.user) {
      const order = await offerCheckoutService.createOfferOrder(
        input,
        { buyerId: session.user.id },
        attribution
      );
      return Response.json(order);
    }

    if (!input.guestEmail) {
      throw new ValidationError("Email is required", {
        guestEmail: ["Email is required for guest checkout"],
      });
    }

    const order = await offerCheckoutService.createOfferOrder(
      input,
      {
        guestEmail: input.guestEmail,
        guestName: input.guestName,
      },
      attribution
    );
    return Response.json(order);
  } catch (error) {
    return formatErrorResponse(error);
  }
}
