"use client";

import { useState, useEffect } from "react";
import {
  Download, FileAudio, FileArchive, Music, Lock,
  Loader2, RefreshCw, Clock, FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface DownloadLink {
  type: "preview" | "master" | "stems";
  label: string;
  url: string;
  filename: string;
  available: boolean;
  reason?: string;
}

interface DownloadAccess {
  beatId: string;
  beatTitle: string;
  purchaseId: string;
  licenseType: string;
  licenseName: string;
  expiresInSeconds: number;
  links: DownloadLink[];
}

interface Props {
  beatId: string;
}

function fileIcon(type: string) {
  switch (type) {
    case "preview": return <Music className="h-5 w-5" />;
    case "master": return <FileAudio className="h-5 w-5" />;
    case "stems": return <FileArchive className="h-5 w-5" />;
    default: return <Download className="h-5 w-5" />;
  }
}

function fileColorClass(type: string) {
  switch (type) {
    case "preview": return "text-blue-400";
    case "master": return "text-success-text";
    case "stems": return "text-violet-400";
    default: return "text-primary";
  }
}

export default function DownloadPanel({ beatId }: Props) {
  const [access, setAccess] = useState<DownloadAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);
  const expiryMinutes = access ? Math.max(1, Math.round(access.expiresInSeconds / 60)) : 15;

  const fetchLinks = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(false);

    try {
      const res = await fetch(`/api/beats/${beatId}/download-links`);
      if (res.ok) {
        const data = await res.json();
        setAccess(data);
      } else {
        setError(true);
        toast.error("Failed to load download links");
      }
    } catch {
      setError(true);
      toast.error("Failed to load download links");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchLinks();
  }, [beatId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDownload = async (link: DownloadLink) => {
    if (!link.available) return;

    setDownloading(link.type);
    try {
      // For signed URLs that are already resolved, open directly
      if (link.url.startsWith("http")) {
        window.open(link.url, "_blank");
      } else {
        // Fallback: use the download endpoint with redirect
        window.open(
          `/api/beats/${beatId}/download?type=${link.type}`,
          "_blank"
        );
      }
      toast.success(`Downloading ${link.label}...`);
    } catch {
      toast.error("Download failed");
    } finally {
      setTimeout(() => setDownloading(null), 1000);
    }
  };

  if (loading) {
    return (
      <Card className="border-success-text/20 bg-success-bg">
        <CardContent className="p-4 space-y-3">
          <Skeleton className="h-5 w-32" />
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!access) {
    if (error) {
      return (
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="flex flex-col items-center p-6 text-center">
            <p className="text-sm font-medium">Failed to load downloads</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Something went wrong. Please try again.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              onClick={() => fetchLinks()}
            >
              <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
              Retry
            </Button>
          </CardContent>
        </Card>
      );
    }
    return null;
  }

  return (
    <Card className="border-success-text/20 bg-success-bg">
      <CardContent className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Your Downloads</h3>
            <p className="text-xs text-muted-foreground">
              {access.licenseName} License
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => fetchLinks(true)}
            disabled={refreshing}
            aria-label="Refresh download links"
            title="Refresh download links"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>
        </div>

        <div className="space-y-2">
          {access.links.map((link) => (
            <div
              key={link.type}
              className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                link.available
                  ? "border-success-text/20 bg-success-bg hover:bg-success-bg/80 cursor-pointer"
                  : "border-border/30 bg-muted/5 opacity-60"
              }`}
              onClick={() => link.available && handleDownload(link)}
              role={link.available ? "button" : undefined}
              tabIndex={link.available ? 0 : undefined}
              onKeyDown={(e) => {
                if (link.available && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  handleDownload(link);
                }
              }}
            >
              <div className={`shrink-0 ${link.available ? fileColorClass(link.type) : "text-muted-foreground"}`}>
                {link.available ? fileIcon(link.type) : <Lock className="h-5 w-5" />}
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{link.label}</p>
                {link.available ? (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Link expires in {expiryMinutes} minutes
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {link.reason}
                  </p>
                )}
              </div>

              {link.available ? (
                <div className="shrink-0">
                  {downloading === link.type ? (
                    <Loader2 className="h-4 w-4 animate-spin text-success-text" />
                  ) : (
                    <Download className="h-4 w-4 text-success-text" />
                  )}
                </div>
              ) : (
                <Badge variant="outline" className="shrink-0 text-xs">
                  Locked
                </Badge>
              )}
            </div>
          ))}
        </div>

        {access.purchaseId && (
          <a
            href={`/api/purchases/${access.purchaseId}/license-pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 flex items-center gap-3 rounded-lg border border-primary/20 bg-primary/5 p-3 transition-colors hover:bg-primary/10"
          >
            <FileText className="h-5 w-5 shrink-0 text-primary" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">License Agreement (PDF)</p>
              <p className="text-xs text-muted-foreground">
                Download your license certificate
              </p>
            </div>
            <Download className="h-4 w-4 shrink-0 text-primary" />
          </a>
        )}

        <p className="mt-3 text-center text-[10px] text-muted-foreground">
          Download links are signed and expire after {expiryMinutes} minutes. Refresh to generate new links.
        </p>
      </CardContent>
    </Card>
  );
}
