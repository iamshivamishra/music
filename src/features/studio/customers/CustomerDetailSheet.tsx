"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Copy, Ticket, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { CustomerDetail } from "@/lib/serializers/crm";
import { formatSpend } from "./format";
import { CustomerPurchaseList } from "./CustomerPurchaseList";

interface CustomerDetailSheetProps {
  customerKey: string | null;
  onOpenChange: (open: boolean) => void;
}

export function CustomerDetailSheet({
  customerKey,
  onOpenChange,
}: CustomerDetailSheetProps) {
  const [detail, setDetail] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!customerKey) {
      setDetail(null);
      setNote("");
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/studio/customers/${encodeURIComponent(customerKey)}`)
      .then(async (res) => {
        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error || "Failed to load customer");
        }
        return res.json() as Promise<CustomerDetail>;
      })
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        setNote(data.note ?? "");
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Failed to load customer");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [customerKey]);

  const saveNote = async () => {
    if (!customerKey) return;
    setSaving(true);
    try {
      const res = await fetch(
        `/api/studio/customers/${encodeURIComponent(customerKey)}/note`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ note }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(err?.error || "Failed to save note");
        return;
      }
      const result = (await res.json()) as { note: string | null };
      setNote(result.note ?? "");
      toast.success("Note saved");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const copyEmail = async () => {
    if (!detail?.email) return;
    await navigator.clipboard.writeText(detail.email);
    toast.success("Email copied");
  };

  return (
    <Sheet open={Boolean(customerKey)} onOpenChange={onOpenChange}>
      <SheetContent className="overflow-y-auto sm:max-w-lg">
        {loading || (customerKey && !detail && !error) ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="sr-only">Loading customer</span>
          </div>
        ) : error || !detail ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            {error || "Customer not found"}
          </div>
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>{detail.name}</SheetTitle>
              <SheetDescription>
                {detail.orderCount} order{detail.orderCount === 1 ? "" : "s"} ·{" "}
                {formatSpend(detail.spend)}
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6 px-4 pb-6">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={copyEmail}
                  disabled={!detail.email}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy email
                </Button>
                {detail.email && (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/studio/coupons?email=${encodeURIComponent(detail.email)}`}>
                      <Ticket className="mr-2 h-4 w-4" />
                      Create coupon
                    </Link>
                  </Button>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-sm font-medium">Purchases</h3>
                <CustomerPurchaseList purchases={detail.purchases} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer-note">Private note</Label>
                <Textarea
                  id="customer-note"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  maxLength={1000}
                  rows={4}
                  placeholder="Only you can see this"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">{note.length}/1000</p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={saveNote}
                    disabled={saving}
                  >
                    {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save note
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
