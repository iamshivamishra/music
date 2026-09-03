"use client";

import { useState, useCallback } from "react";
import { Share2, Copy, Check, ExternalLink } from "lucide-react";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { buildWhatsAppBeatShareUrl, trackBeatShare } from "@/lib/utils/whatsapp";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ShareDialogProps {
  url: string;
  title: string;
  /** Producer name for WhatsApp share text */
  producerName?: string;
  /** Beat ID for share tracking */
  beatId?: string;
  /** Custom trigger element */
  trigger?: React.ReactElement;
}

const PLATFORMS = [
  {
    name: "WhatsApp",
    icon: () => <WhatsAppIcon className="h-4 w-4" />,
    buildUrl: (url: string, title: string, producerName?: string) =>
      buildWhatsAppBeatShareUrl(title, producerName, url),
  },
  {
    name: "X",
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
    buildUrl: (url: string, title: string) =>
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
  },
  {
    name: "Facebook",
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
      </svg>
    ),
    buildUrl: (url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    name: "Telegram",
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
        <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
      </svg>
    ),
    buildUrl: (url: string, title: string) =>
      `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
  },
] as const;

export default function ShareDialog({
  url,
  title,
  producerName,
  beatId,
  trigger,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      trackBeatShare(beatId);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard not available
    }
  }, [url, beatId]);

  const handleNativeShare = useCallback(async () => {
    try {
      await navigator.share({ title, url });
      trackBeatShare(beatId);
      setOpen(false);
    } catch {
      // user cancelled or unsupported
    }
  }, [title, url, beatId]);

  const handlePlatformClick = useCallback((platformName: string) => {
    trackBeatShare(beatId, platformName === "WhatsApp" ? "whatsapp" : undefined);
  }, [beatId]);

  const supportsNativeShare =
    typeof navigator !== "undefined" && !!navigator.share;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={trigger ?? (
          <Button
            variant="ghost"
            size="sm"
            aria-label="Share this beat"
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Share2 className="h-4 w-4" />
            <span className="text-xs">Share</span>
          </Button>
        )}
      />
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Share</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-4 gap-3">
          {PLATFORMS.map((platform) => (
            <a
              key={platform.name}
              href={platform.buildUrl(url, title, producerName)}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handlePlatformClick(platform.name)}
              className="flex flex-col items-center gap-1.5 rounded-lg border border-border/50 p-3 text-muted-foreground transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-foreground"
              aria-label={`Share on ${platform.name}`}
            >
              <platform.icon />
              <span className="text-[11px]">{platform.name}</span>
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/50 p-2">
          <input
            readOnly
            value={url}
            className="min-w-0 flex-1 bg-transparent text-xs text-foreground outline-none"
            onClick={(e) => (e.target as HTMLInputElement).select()}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="shrink-0 gap-1.5"
          >
            {copied ? (
              <>
                <Check className="h-3.5 w-3.5 text-success-text" />
                <span className="text-xs">Copied</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span className="text-xs">Copy</span>
              </>
            )}
          </Button>
        </div>

        {supportsNativeShare && (
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={handleNativeShare}
          >
            <ExternalLink className="h-4 w-4" />
            More sharing options
          </Button>
        )}
      </DialogContent>
    </Dialog>
  );
}
