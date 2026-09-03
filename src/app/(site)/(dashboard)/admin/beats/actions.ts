"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { beatService } from "@/lib/services/beat.service";
import { AppError } from "@/lib/errors";
import { objectIdSchema } from "@/lib/validators/params";

export async function deleteBeatAction(
  formData: FormData
): Promise<{ error?: string }> {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    return { error: "Unauthorized" };
  }

  const parsed = objectIdSchema.safeParse(formData.get("beatId"));
  if (!parsed.success) {
    return { error: "Invalid beat id" };
  }

  try {
    await beatService.delete(parsed.data, session.user.id, "admin");
  } catch (error) {
    if (error instanceof AppError) {
      return { error: error.message };
    }
    throw error;
  }

  revalidatePath("/admin/beats");
  return {};
}
