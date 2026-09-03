"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormField } from "@/components/ui/form-field";
import { openServiceRazorpayCheckout } from "@/features/payments/openServiceRazorpayCheckout";
import type { IServiceExtra } from "@/types";

interface Props {
  listingId: string;
  extras: IServiceExtra[];
  startingPrice: number;
  depositPercent: number;
  isLoggedIn: boolean;
}

export default function ServiceBriefForm({
  listingId,
  extras,
  startingPrice,
  depositPercent,
  isLoggedIn,
}: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState("");
  const [referencesUrl, setReferencesUrl] = useState("");
  const [bpm, setBpm] = useState("");
  const [genre, setGenre] = useState("");
  const [duePreference, setDuePreference] = useState("");
  const [selectedExtras, setSelectedExtras] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const extrasTotal = selectedExtras.reduce(
    (sum, index) => sum + (extras[index]?.price ?? 0),
    0
  );
  const quotedTotal = startingPrice + extrasTotal;
  const depositAmount = Math.max(1, Math.round((quotedTotal * depositPercent) / 100));

  const toggleExtra = (index: number) => {
    setSelectedExtras((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index]
    );
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isLoggedIn) {
      router.push(`/login?callbackUrl=/services/${listingId}`);
      return;
    }

    setSubmitting(true);
    setErrors({});
    try {
      const res = await fetch("/api/service-jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          notes: notes.trim(),
          referencesUrl: referencesUrl.trim() || undefined,
          bpm: bpm ? Number(bpm) : undefined,
          genre: genre.trim() || undefined,
          duePreference: duePreference.trim() || undefined,
          extraIndexes: selectedExtras,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (data?.details && typeof data.details === "object") {
          const next: Record<string, string> = {};
          for (const [key, messages] of Object.entries(data.details)) {
            if (Array.isArray(messages) && messages[0]) next[key] = String(messages[0]);
          }
          setErrors(next);
        }
        toast.error(data?.error || "Could not start booking");
        return;
      }

      await openServiceRazorpayCheckout({
        orderId: data.orderId,
        amount: data.amount,
        description: `Deposit for ${data.serviceTitle ?? "service"}`,
        onSuccess: () => {
          router.push(`/checkout/success?orderId=${data.internalOrderId}`);
        },
      });
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-border/50 bg-card/80 p-5"
    >
      <FormField label="Brief" htmlFor="notes" error={errors.notes}>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={5}
          maxLength={5000}
          required
          aria-required="true"
          placeholder="References, mood, intended use, anything the producer should know."
        />
      </FormField>
      <FormField
        label="Reference URL (optional)"
        htmlFor="referencesUrl"
        error={errors.referencesUrl}
      >
        <Input
          id="referencesUrl"
          type="url"
          value={referencesUrl}
          onChange={(e) => setReferencesUrl(e.target.value)}
          placeholder="https://"
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="BPM (optional)" htmlFor="bpm" error={errors.bpm}>
          <Input
            id="bpm"
            type="number"
            min={40}
            max={300}
            value={bpm}
            onChange={(e) => setBpm(e.target.value)}
          />
        </FormField>
        <FormField label="Genre (optional)" htmlFor="genre">
          <Input
            id="genre"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            maxLength={60}
          />
        </FormField>
      </div>
      <FormField label="Due preference (optional)" htmlFor="duePreference">
        <Input
          id="duePreference"
          value={duePreference}
          onChange={(e) => setDuePreference(e.target.value)}
          maxLength={200}
          placeholder="e.g. before Friday if possible"
        />
      </FormField>

      {extras.length > 0 && (
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Extras</legend>
          <ul className="space-y-2">
            {extras.map((extra, index) => (
              <li key={`${extra.name}-${index}`}>
                <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-border/40 px-3 py-2 text-sm">
                  <span className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedExtras.includes(index)}
                      onChange={() => toggleExtra(index)}
                    />
                    {extra.name}
                  </span>
                  <span>+₹{extra.price.toLocaleString("en-IN")}</span>
                </label>
              </li>
            ))}
          </ul>
        </fieldset>
      )}

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Deposit due now ({depositPercent}%)
        </span>
        <span className="font-semibold">₹{depositAmount.toLocaleString("en-IN")}</span>
      </div>

      <Button type="submit" disabled={submitting} className="w-full">
        {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
        {isLoggedIn ? `Pay ₹${depositAmount.toLocaleString("en-IN")} deposit` : "Log in to book"}
      </Button>
    </form>
  );
}
