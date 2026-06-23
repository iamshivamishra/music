import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { authService } from "@/lib/services/auth.service";
import { formatErrorResponse, UnauthorizedError } from "@/lib/errors";
import { z } from "zod";

const onboardingSchema = z.object({
  role: z.enum(["buyer", "producer"], {
    error: "Role must be either buyer or producer",
  }),
});

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const body = await request.json();
    const { role } = onboardingSchema.parse(body);

    const user = await authService.setRole(session.user.id, role);

    return Response.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
