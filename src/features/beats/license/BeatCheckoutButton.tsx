"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

const RazorpayButton = dynamic(() => import("@/features/payments/RazorpayButton"), {
  ssr: false,
  loading: () => <Skeleton className="h-11 w-full rounded-md" />,
});

const GuestRazorpayButton = dynamic(
  () => import("@/features/payments/GuestRazorpayButton"),
  { ssr: false, loading: () => <Skeleton className="h-11 w-full rounded-md" /> }
);

export function BeatCheckoutButton({
  isLoggedIn,
  beatId,
  licenseId,
  price,
  beatTitle,
  licenseType,
  accessToken,
  disabled,
}: {
  isLoggedIn: boolean;
  beatId: string;
  licenseId: string;
  price: number;
  beatTitle: string;
  licenseType: string;
  accessToken?: string;
  disabled?: boolean;
}) {
  const props = {
    beatId,
    licenseId,
    price,
    beatTitle,
    licenseType,
    accessToken,
    disabled,
  };

  return isLoggedIn ? (
    <RazorpayButton {...props} />
  ) : (
    <GuestRazorpayButton {...props} />
  );
}
