import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { invitationService } from "@/lib/services/invitation.service";
import { AppError } from "@/lib/errors";
import OnboardingForm from "./OnboardingForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Choose Your Role",
};

interface Props {
  searchParams: Promise<{ role?: string; invite?: string }>;
}

export default async function OnboardingPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  let foundingInviteValid = false;
  let inviteError: string | null = null;

  if (params.invite) {
    try {
      await invitationService.validate(params.invite, session.user.id);
      foundingInviteValid = true;
    } catch (error) {
      if (error instanceof AppError && error.code === "INVITE_EXPIRED") {
        inviteError = "Invitation expired, join the waitlist";
      } else if (error instanceof AppError) {
        inviteError = error.message;
      } else {
        inviteError = "Could not apply invitation";
      }
    }
  }

  const defaultRole =
    foundingInviteValid || params.role === "producer"
      ? "producer"
      : params.role === "buyer"
        ? "buyer"
        : null;

  return (
    <div className="app-container flex min-h-[calc(100vh-8rem)] items-center justify-center py-10">
      <OnboardingForm
        userName={session.user.name || "there"}
        defaultRole={defaultRole}
        foundingInviteValid={foundingInviteValid}
        inviteToken={foundingInviteValid ? params.invite : undefined}
        inviteError={inviteError}
      />
    </div>
  );
}
