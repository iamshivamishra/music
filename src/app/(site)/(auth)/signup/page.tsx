import type { Metadata } from "next";
import SignupForm from "@/components/SignupForm";

export const metadata: Metadata = {
  title: "Create Account",
};

interface Props {
  searchParams: Promise<{ role?: string; invite?: string; email?: string; next?: string }>;
}

export default async function SignupPage({ searchParams }: Props) {
  const params = await searchParams;
  const defaultRole = params.role === "producer" ? "producer" : "buyer";
  return (
    <SignupForm
      defaultRole={defaultRole}
      inviteToken={params.invite}
      defaultEmail={params.email}
      nextPath={params.next}
    />
  );
}
