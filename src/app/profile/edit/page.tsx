import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { userRepository } from "@/lib/repositories/user.repository";
import EditProfileForm from "./EditProfileForm";

export const metadata: Metadata = { title: "Edit Profile" };

export default async function EditProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const user = await userRepository.findById(session.user.id);
  if (!user) redirect("/login");

  const serialized = JSON.parse(JSON.stringify(user));

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <EditProfileForm user={serialized} />
    </div>
  );
}
