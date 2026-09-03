import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import VerifyLicenseClient from "@/features/profile/VerifyLicenseClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Verify License" };

export default async function VerifyLicensePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <Suspense>
      <VerifyLicenseClient />
    </Suspense>
  );
}
