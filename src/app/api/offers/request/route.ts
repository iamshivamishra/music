import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { offerService } from "@/lib/services/offer.service";
import { requestOfferSchema } from "@/lib/validators/offer";
import { formatErrorResponse } from "@/lib/errors";
import { rateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { resolveUnlistedAccessToken } from "@/lib/unlisted-token";

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const body = requestOfferSchema.parse(await request.json());

    const ipLimit = await rateLimit(ip, {
      limit: 5,
      windowSec: 86400,
      prefix: "offer-request",
    });
    if (!ipLimit.success) return rateLimitResponse(ipLimit.resetAt);

    const beatLimit = await rateLimit(`${ip}:${body.beatId}`, {
      limit: 5,
      windowSec: 86400,
      prefix: "offer-request-beat",
    });
    if (!beatLimit.success) return rateLimitResponse(beatLimit.resetAt);

    const session = await auth();
    const accessToken = await resolveUnlistedAccessToken({
      beatId: body.beatId,
      bodyToken: body.accessToken,
    });
    const offer = await offerService.requestOffer(
      { ...body, accessToken },
      {
        userId: session?.user?.id,
        userEmail: session?.user?.email,
      }
    );

    return Response.json({ success: true, id: offer._id.toString() }, { status: 201 });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
