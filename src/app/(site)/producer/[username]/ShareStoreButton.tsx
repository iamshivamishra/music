"use client";

import { useCallback, useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { Button } from "@/components/ui/button";
import { buildStoreShareText, buildWhatsAppShareUrl } from "@/lib/utils/whatsapp";

interface ShareStoreButtonProps {
  displayName: string;
  storeUrl: string;
}

export default function ShareStoreButton({
  displayName,
  storeUrl,
}: ShareStoreButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(storeUrl);
      setCopied(true);
      toast.success("Store link copied");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Could not copy link");
    }
  }, [storeUrl]);

  const shareText = buildStoreShareText(displayName, storeUrl);
  const whatsappUrl = buildWhatsAppShareUrl(shareText);

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={handleCopy}
        aria-label="Copy store link"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? "Copied" : "Copy link"}
      </Button>
      <Button asChild variant="outline" size="sm">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Share store on WhatsApp"
        >
          <WhatsAppIcon className="h-4 w-4" />
          Share
        </a>
      </Button>
    </div>
  );
}
