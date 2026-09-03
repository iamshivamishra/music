import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { authService } from "@/lib/services/auth.service";
import { serializeLean } from "@/lib/serializers/lean";
import EditProfileForm from "@/features/profile/EditProfileForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Edit Profile" };

export default async function EditProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await authService.getProfile(session.user.id);

  return (
    <div className="page-shell max-w-2xl">
      <EditProfileForm user={serializeLean(user)} />
    </div>
  );
}
