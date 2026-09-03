import { auth } from "@/lib/auth";
import { followService } from "@/lib/services/follow.service";
import { formatErrorResponse } from "@/lib/errors";

interface Params {
  params: Promise<{ slug: string }>;
}

export async function GET(_req: Request, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ isFollowing: false, isLoggedIn: false });
    }

    const { slug: producerId } = await params;
    const isFollowing = await followService.getStatus(
      session.user.id,
      producerId
    );

    return Response.json({ isFollowing, isLoggedIn: true });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
