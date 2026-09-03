"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface FreeDownloadCardProps {
  beatId: string;
  producerName: string;
  prefillEmail?: string;
}

function startDownload(url: string, filename: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export default function FreeDownloadCard({
  beatId,
  producerName,
  prefillEmail,
}: FreeDownloadCardProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState(prefillEmail ?? "");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [fieldError, setFieldError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim() && !whatsappNumber.trim()) {
      setFieldError("Enter an email or WhatsApp number");
      return;
    }
    if (!consent) {
      setFieldError("Consent is required");
      return;
    }

    setFieldError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/beats/${beatId}/free-download`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim() || undefined,
          whatsappNumber: whatsappNumber.trim() || undefined,
          consent: true,
        }),
      });
      const payload = (await res.json().catch(() => ({}))) as {
        error?: string;
        downloadUrl?: string;
        filename?: string;
      };
      if (!res.ok || !payload.downloadUrl) {
        throw new Error(payload.error || "Could not start download");
      }
      startDownload(payload.downloadUrl, payload.filename || "preview.mp3");
      toast.success("Download started. MP3 includes producer tags.");
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Card className="border-border/50 bg-card/80">
        <CardContent className="space-y-3 p-5">
          <div>
            <p className="font-semibold">Free tagged MP3</p>
            <p className="mt-1 text-sm text-muted-foreground">
              MP3 includes producer tags. WAV/stems require a license.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => setOpen(true)}
          >
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Get free tagged MP3
          </Button>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Get a free tagged MP3</DialogTitle>
            <DialogDescription>
              MP3 includes producer tags. WAV/stems require a license.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="free-download-email">Email</Label>
              <Input
                id="free-download-email"
                type="email"
                autoComplete="email"
                autoFocus
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                aria-required="true"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="free-download-whatsapp">WhatsApp</Label>
              <Input
                id="free-download-whatsapp"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={whatsappNumber}
                onChange={(event) => setWhatsappNumber(event.target.value)}
                placeholder="10-digit Indian number"
              />
            </div>
            <label className="flex items-start gap-2 text-sm leading-snug">
              <input
                id="free-download-consent"
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary"
                aria-required="true"
              />
              <span>
                I agree to hear from {producerName} and Trishul Beats about this
                catalog
              </span>
            </label>
            {fieldError && (
              <p role="alert" className="text-sm text-destructive">
                {fieldError}
              </p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Download className="mr-2 h-4 w-4" aria-hidden="true" />
                )}
                Download tagged MP3
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
