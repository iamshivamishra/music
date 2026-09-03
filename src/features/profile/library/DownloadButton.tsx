"use client";

import { useState, useCallback } from "react";
import { Download, Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

function triggerDownload(url: string, filename: string) {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export function DownloadButton({
  purchaseId,
  type,
  label,
  available,
  upgradeTier,
  reason,
  url,
  filename,
}: {
  label: string;
  available: boolean;
  purchaseId?: string;
  type?: "preview" | "master" | "stems";
  upgradeTier?: string;
  reason?: string;
  url?: string;
  filename?: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleDownload = useCallback(async () => {
    if (!available) return;
    setLoading(true);
    try {
      if (url) {
        triggerDownload(url, filename || label);
        return;
      }
      if (!purchaseId || !type) {
        throw new Error("Download failed");
      }
      const res = await fetch(
        `/api/purchases/${purchaseId}/download?type=${type}&json=true`
      );
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error || "Download failed");
      }
      const data = (await res.json()) as { url: string; filename: string };
      triggerDownload(data.url, data.filename);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Download failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, [available, url, filename, label, purchaseId, type]);

  if (!available) {
    const lockReason =
      reason || (upgradeTier ? `Upgrade to ${upgradeTier}` : "Not available");
    return (
      <button
        type="button"
        disabled
        aria-label={`${label} locked. ${lockReason}`}
        className="flex min-h-11 items-center gap-1.5 rounded-lg border border-border/50 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground"
      >
        <Lock className="h-3 w-3" aria-hidden="true" />
        <span>
          {label}
          <span className="ml-1 text-muted-foreground/80">· {lockReason}</span>
        </span>
      </button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => void handleDownload()}
      disabled={loading}
      aria-label={`Download ${label}`}
      className="min-h-11 gap-1.5 text-xs sm:min-h-9"
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="h-3 w-3" aria-hidden="true" />
      )}
      {label}
    </Button>
  );
}
