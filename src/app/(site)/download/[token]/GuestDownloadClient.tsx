"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Music, RefreshCw } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DownloadButton } from "@/features/profile/library/DownloadButton";
import { guestSignupHref } from "@/features/payments/guest-signup";
import { tierAccent } from "@/lib/license-ui";
import type { GuestDownloadDto } from "@/lib/serializers/download";

function formatExpiry(expiresAt?: string | Date): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return "Expired";
  const hours = Math.max(1, Math.round(ms / (60 * 60 * 1000)));
  return hours >= 24
    ? `${Math.round(hours / 24)} day${hours >= 48 ? "s" : ""}`
    : `${hours} hour${hours === 1 ? "" : "s"}`;
}

export default function GuestDownloadClient({
  token,
  initialData,
}: {
  token: string;
  initialData: GuestDownloadDto;
}) {
  const [data, setData] = useState(initialData);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refreshLinks = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      const res = await fetch(`/api/download/${token}`);
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error || "Could not load your downloads");
      }
      setData((await res.json()) as GuestDownloadDto);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load your downloads");
    } finally {
      setRefreshing(false);
    }
  }, [token]);

  const expiryLabel = formatExpiry(data.expiresAt);
  const signupHref = guestSignupHref(data.guestEmail);

  if (error) {
    return (
      <div className="page-shell max-w-2xl">
        <div className="page-header">
          <h1 className="page-title">Download Your Beats</h1>
          <p className="page-subtitle">{error}</p>
        </div>
        <Button onClick={() => void refreshLinks()} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
          Try again
        </Button>
      </div>
    );
  }

  return (
    <div className="page-shell max-w-2xl">
      <div className="page-header">
        <h1 className="page-title">Payment successful. Your beats are ready.</h1>
        <p className="page-subtitle">
          {expiryLabel
            ? `Download links expire in ${expiryLabel}. Create an account to keep them permanently.`
            : "Create an account to save these purchases to your library."}
        </p>
      </div>

      <div className="space-y-4">
        {data.items.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="p-6 text-center text-sm text-muted-foreground">
              No files are attached to this purchase yet. Refresh the page or check your email.
            </CardContent>
          </Card>
        ) : (
          data.items.map((item) => (
            <article
              key={item.beatId}
              className="rounded-xl border border-border/50 bg-card"
            >
              <div className="flex items-center gap-3 p-3 sm:gap-4 sm:p-4">
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-muted sm:h-16 sm:w-16">
                  {item.coverUrl ? (
                    <Image
                      src={item.coverUrl}
                      alt=""
                      fill
                      className="object-cover"
                      sizes="64px"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center">
                      <Music className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="truncate text-sm font-semibold sm:text-base">
                      {item.beatTitle}
                    </h2>
                    <p className="shrink-0 text-sm font-bold">
                      ₹{item.amount.toLocaleString("en-IN")}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`mt-1.5 capitalize text-[11px] ${tierAccent(item.licenseType)} border-current/25`}
                  >
                    {item.licenseType}
                  </Badge>
                </div>
              </div>
              <div className="border-t border-border/30 px-3 py-3 sm:px-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-muted-foreground">Downloads</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => void refreshLinks()}
                    disabled={refreshing}
                    aria-label="Refresh download links"
                    className="h-8 px-2 text-xs"
                  >
                    <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {item.links.map((link) => (
                    <DownloadButton
                      key={`${item.beatId}-${link.type}`}
                      label={link.label}
                      available={link.available}
                      reason={link.reason}
                      url={link.url}
                      filename={link.filename}
                    />
                  ))}
                </div>
              </div>
            </article>
          ))
        )}

        <Card className="border-border/50 bg-muted/30">
          <CardContent className="space-y-3 p-5">
            <p className="text-sm font-medium">
              Want to save your purchases and re-download anytime?
            </p>
            <Button asChild className="w-full sm:w-auto">
              <Link href={signupHref}>
                {data.guestEmail
                  ? `Create account with ${data.guestEmail}`
                  : "Create account"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
