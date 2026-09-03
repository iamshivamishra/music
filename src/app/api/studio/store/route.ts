import { NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { storeService } from "@/lib/services/store.service";
import { updateStoreSchema } from "@/lib/validators/store";
import { formatErrorResponse, ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { getClientIp, rateLimit, rateLimitResponse } from "@/lib/rate-limit";

export async function PATCH(request: NextRequest) {
  try {
    const ip = getClientIp(request);
    const rl = await rateLimit(ip, { limit: 10, windowSec: 60, prefix: "store-update" });
    if (!rl.success) return rateLimitResponse(rl.resetAt);

    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();
    if (session.user.role !== "producer" && session.user.role !== "admin") {
      throw new ForbiddenError("Only producers can manage a store");
    }

    const input = updateStoreSchema.parse(await request.json());
    const user = await storeService.updateStore(
      session.user.id,
      input,
      session.user.id,
      session.user.role
    );

    if (user.username) {
      revalidatePath(`/producer/${user.username}`);
      revalidatePath(`/p/${user.username}`);
    }

    return Response.json({ store: user.store, username: user.username });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
