import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { userRepository } from "@/lib/repositories/user.repository";
import { updateProfileSchema } from "@/lib/validators/auth";
import { formatErrorResponse, UnauthorizedError, ConflictError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const user = await userRepository.findById(session.user.id);
    return Response.json({ user });
  } catch (error) {
    return formatErrorResponse(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) throw new UnauthorizedError();

    const body = await request.json();
    const input = updateProfileSchema.parse(body);

    if (input.username) {
      const taken = await userRepository.usernameExists(input.username, session.user.id);
      if (taken) throw new ConflictError("This username is already taken");
    }

    const user = await userRepository.update(session.user.id, input);
    return Response.json({ user });
  } catch (error) {
    return formatErrorResponse(error);
  }
}
