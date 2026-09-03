"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { adminService } from "@/lib/services/admin.service";
import { objectIdSchema } from "@/lib/validators/params";

const userRoleSchema = z.enum(["buyer", "producer", "admin"]);

async function assertAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function updateUserRoleAction(formData: FormData) {
  const session = await assertAdmin();
  const userId = objectIdSchema.parse(formData.get("userId"));
  const role = userRoleSchema.parse(formData.get("role"));
  await adminService.updateUserRole(userId, role, session.user.id);
  revalidatePath("/admin/users");
}

export async function toggleUserVerifiedAction(formData: FormData) {
  const session = await assertAdmin();
  const userId = objectIdSchema.parse(formData.get("userId"));
  await adminService.toggleUserVerified(userId, session.user.id);
  revalidatePath("/admin/users");
}
