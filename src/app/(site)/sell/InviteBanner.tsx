"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Crown, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface InviteData {
  name: string;
  email: string;
  producerTier: string;
  platformFeeOverride: number;
}

export default function InviteBanner() {
  const searchParams = useSearchParams();
  const token = searchParams.get("invite");
  const { data: session, update: updateSession } = useSession();

  const [invite, setInvite] = useState<InviteData | null>(null);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [accepted, setAccepted] = useState(false);

  useEffect(() => {
    if (!token) return;

    fetch(`/api/invitations/accept?token=${token}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.valid) {
          setInvite(data);
        } else if (data.code === "INVITE_EXPIRED" || /expir/i.test(data.error ?? "")) {
          setExpired(true);
          setError("Invitation expired, join the waitlist");
        } else {
          setError(data.error || "Invalid invitation");
        }
      })
      .catch(() => setError("Failed to validate invitation"));
  }, [token]);

  async function handleAccept() {
    if (!token) return;
    setAccepting(true);
    setError("");

    try {
      const res = await fetch("/api/invitations/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to accept invitation");
        return;
      }

      setAccepted(true);
      await updateSession({ role: "producer" });
    } catch {
      setError("Failed to accept invitation");
    } finally {
      setAccepting(false);
    }
  }

  if (!token) return null;

  if (accepted) {
    return (
      <div className="border-b border-amber-500/30 bg-amber-500/10">
        <div className="app-container flex items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-3">
            <Crown className="h-6 w-6 text-amber-400" />
            <div>
              <p className="font-semibold text-amber-400">
                Welcome, Founding Producer!
              </p>
              <p className="text-sm text-amber-400/70">
                You have 0% platform fees for the next 6 months.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="shrink-0">
            <Link href="/onboarding">
              Complete Setup <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-b border-destructive/30 bg-destructive/10">
        <div className="app-container flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-destructive">
            {expired ? "Invitation expired, join the waitlist" : error}
          </p>
          {expired && (
            <Button asChild size="sm" variant="outline">
              <a href="#waitlist">Join the waitlist</a>
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="border-b border-amber-500/30 bg-amber-500/10">
        <div className="app-container flex items-center gap-3 py-4">
          <Loader2 className="h-5 w-5 animate-spin text-amber-400" />
          <p className="text-sm text-amber-400">Validating your invitation…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-amber-500/30 bg-amber-500/10">
      <div className="app-container flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Crown className="mt-0.5 h-6 w-6 shrink-0 text-amber-400" />
          <div>
            <p className="font-semibold text-amber-400">
              Hi {invite.name}! You&rsquo;re invited to be a Founding Producer
            </p>
            <p className="mt-1 text-sm text-amber-400/70">
              Enjoy 0% platform fees for 6 months, a Founding Producer badge,
              and featured marketplace placement.
            </p>
          </div>
        </div>
        {session?.user ? (
          <Button
            onClick={handleAccept}
            disabled={accepting}
            className="shrink-0 bg-amber-500 text-black hover:bg-amber-400"
          >
            {accepting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Accepting…
              </>
            ) : (
              <>
                <Crown className="mr-2 h-4 w-4" />
                Accept Invitation
              </>
            )}
          </Button>
        ) : (
          <Button asChild className="shrink-0 bg-amber-500 text-black hover:bg-amber-400">
            <Link href={`/signup?role=producer&invite=${token}`}>
              Sign Up to Accept <ArrowRight className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </div>
  );
}
