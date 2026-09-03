"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, Copy, ExternalLink, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { buildBeatShareText, buildWhatsAppShareUrl, trackBeatShare } from "@/lib/utils/whatsapp";

interface PublishSuccessCardProps {
  beatId: string;
  beatTitle: string;
  producerName?: string;
  onDismiss: () => void;
}

export default function PublishSuccessCard({
  beatId,
  beatTitle,
  producerName,
  onDismiss,
}: PublishSuccessCardProps) {
  const [copied, setCopied] = useState(false);

  const beatUrl = `${window.location.origin}/beats/${beatId}`;
  const shareText = buildBeatShareText(beatTitle, producerName, beatUrl);
  const whatsappUrl = buildWhatsAppShareUrl(shareText);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(beatUrl);
      setCopied(true);
      toast.success("Link copied!");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Failed to copy link");
    }
  };

  const handleWhatsAppShare = () => {
    trackBeatShare(beatId);
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <Card className="mb-6 rounded-2xl border-green-600/30 bg-green-600/5 shadow-sm">
      <CardContent className="flex flex-col items-center gap-4 py-6 text-center sm:flex-row sm:text-left">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-600/20">
          <CheckCircle2 className="h-6 w-6 text-green-400" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold">Your beat is live!</p>
          <p className="text-sm text-muted-foreground">
            &ldquo;{beatTitle}&rdquo; is now on the marketplace. Share it to get your first sale.
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button variant="outline" size="sm" onClick={handleCopy}>
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            {copied ? "Copied!" : "Copy Link"}
          </Button>
          <Button
            size="sm"
            className="bg-green-600 text-white hover:bg-green-700"
            onClick={handleWhatsAppShare}
          >
            <WhatsAppIcon className="mr-1.5 h-3.5 w-3.5" />
            Share on WhatsApp
          </Button>
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/beats/${beatId}`}>
              <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
              View
            </Link>
          </Button>
          <button
            onClick={onDismiss}
            className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
