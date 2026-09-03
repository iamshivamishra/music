"use client";

import { useEffect, useState } from "react";
import OfferRazorpayButton from "@/features/payments/OfferRazorpayButton";

interface OfferCheckoutClientProps {
  token: string;
  amount: number;
  beatTitle: string;
  licenseName: string;
  expiresAt: string;
  isLoggedIn: boolean;
  status: string;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Expired";
  const totalSec = Math.floor(ms / 1000);
  const hours = Math.floor(totalSec / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  if (hours > 0) return `${hours}h ${minutes}m left`;
  if (minutes > 0) return `${minutes}m ${seconds}s left`;
  return `${seconds}s left`;
}

export default function OfferCheckoutClient({
  token,
  amount,
  beatTitle,
  licenseName,
  expiresAt,
  isLoggedIn,
  status,
}: OfferCheckoutClientProps) {
  const [remainingMs, setRemainingMs] = useState(
    () => new Date(expiresAt).getTime() - Date.now()
  );

  useEffect(() => {
    const tick = () => setRemainingMs(new Date(expiresAt).getTime() - Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [expiresAt]);

  const expired = remainingMs <= 0 || status === "expired";
  const accepted = status === "accepted";
  const canBuy = status === "open" && !expired;

  return (
    <div className="space-y-4">
      <p className="text-center text-sm text-muted-foreground" aria-live="polite">
        {accepted
          ? "This offer has already been paid."
          : expired
            ? "This offer has expired."
            : formatRemaining(remainingMs)}
      </p>
      {canBuy ? (
        <OfferRazorpayButton
          token={token}
          price={amount}
          beatTitle={beatTitle}
          licenseName={licenseName}
          isLoggedIn={isLoggedIn}
        />
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Ask the producer for a new pay link if you still want this beat.
        </p>
      )}
    </div>
  );
}
