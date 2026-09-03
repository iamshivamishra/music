"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface RequestCustomPriceProps {
  beatId: string;
  beatTitle: string;
  isLoggedIn: boolean;
  accessToken?: string;
}

export default function RequestCustomPrice({
  beatId,
  beatTitle,
  isLoggedIn,
  accessToken,
}: RequestCustomPriceProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!isLoggedIn && !email) {
      toast.error("Please enter your email");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/offers/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beatId,
          note: note || undefined,
          email: isLoggedIn ? undefined : email,
          accessToken,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(err?.error || "Could not send request");
        return;
      }
      toast.success("Request sent. The producer will follow up if they can do a custom price.");
      setOpen(false);
      setNote("");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        className="w-full text-muted-foreground"
        onClick={() => setOpen(true)}
      >
        Request a custom price
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request a custom price</DialogTitle>
            <DialogDescription>
              Tell the producer what you need for &ldquo;{beatTitle}&rdquo;. This does not replace the listed licenses.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {!isLoggedIn && (
              <div className="space-y-2">
                <Label htmlFor="request-email">Email *</Label>
                <Input
                  id="request-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoFocus
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="request-note">Note</Label>
              <Textarea
                id="request-note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={4}
                placeholder="e.g. ₹8,000 exclusive for one track"
              />
            </div>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full">
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                "Send request"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
