import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import OnboardingForm from "./OnboardingForm";

export const metadata: Metadata = {
  title: "Choose Your Role",
};

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="flex min-h-[calc(100vh-8rem)] items-center justify-center px-4 py-12">
      <OnboardingForm userName={session.user.name || "there"} />
    </div>
  );
}
