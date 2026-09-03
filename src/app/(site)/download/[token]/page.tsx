import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { guestPaymentService } from "@/lib/services/guest-payment.service";
import GuestDownloadClient from "./GuestDownloadClient";
import { GuestDownloadExpired } from "./GuestDownloadExpired";

export const metadata: Metadata = {
  title: "Download Your Beats",
  robots: { index: false, follow: false },
};

interface Props {
  params: Promise<{ token: string }>;
}

export default async function GuestDownloadPage({ params }: Props) {
  const { token } = await params;
  const result = await guestPaymentService.getGuestDownload(token);

  if (result.status === "invalid") {
    notFound();
  }

  if (result.status === "expired") {
    return <GuestDownloadExpired email={result.guestEmail} />;
  }

  return <GuestDownloadClient token={token} initialData={result.download} />;
}
