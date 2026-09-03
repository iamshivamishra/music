"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  CreateOfferDialog,
  EMPTY_OFFER_FORM,
  type CreateOfferForm,
  type OfferBeatOption,
} from "@/features/studio/CreateOfferDialog";
import { OffersEmptyCard } from "@/features/studio/OffersEmptyCard";
import { OffersTable } from "@/features/studio/OffersTable";
import type { StudioOfferDto } from "@/lib/serializers/offer";
import type { OfferListTab } from "@/types";

const TABS: { value: OfferListTab; label: string }[] = [
  { value: "requests", label: "Requests" },
  { value: "open", label: "Open" },
  { value: "closed", label: "Closed" },
];

interface Props {
  offers: StudioOfferDto[];
  beats: OfferBeatOption[];
  pagination: {
    page: number;
    totalPages: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  currentTab: OfferListTab;
  initialBeatId?: string;
}

export default function StudioOffersClient({
  offers,
  beats,
  pagination,
  currentTab,
  initialBeatId,
}: Props) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(Boolean(initialBeatId));
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [form, setForm] = useState<CreateOfferForm>({
    ...EMPTY_OFFER_FORM,
    beatId: initialBeatId || "",
  });

  const openCreate = () => {
    setForm({ ...EMPTY_OFFER_FORM, beatId: initialBeatId || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        beatId: form.beatId,
        licenseType: form.licenseType,
        amount: Number(form.amount),
        expiresInHours: Number(form.expiresInHours) || 48,
      };
      if (form.buyerEmail) body.buyerEmail = form.buyerEmail;
      if (form.note) body.note = form.note;
      if (form.requestId) body.requestId = form.requestId;

      const res = await fetch("/api/offers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(err?.error || "Failed to create offer");
        return;
      }
      toast.success("Offer created");
      setDialogOpen(false);
      router.push("/studio/offers?tab=open");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleWithdraw = async (offer: StudioOfferDto) => {
    setActionLoading(offer.id);
    try {
      const res = await fetch(`/api/offers/${offer.id}`, { method: "PATCH" });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(err?.error || "Failed to withdraw");
        return;
      }
      toast.success("Offer withdrawn");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="page-shell">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Offers</h1>
          <p className="text-muted-foreground">
            Send a private pay link with a negotiated price
          </p>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Create offer
        </Button>
      </div>

      <div className="mb-6 flex w-fit items-center gap-1 rounded-xl border border-border/50 bg-card/60 p-1.5 shadow-sm">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => router.push(`/studio/offers?tab=${tab.value}`)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              currentTab === tab.value
                ? "bg-primary/90 text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {offers.length > 0 ? (
        <OffersTable
          offers={offers}
          actionLoading={actionLoading}
          onCopy={async (url) => {
            await navigator.clipboard.writeText(url);
            toast.success("Pay link copied");
          }}
          onWithdraw={handleWithdraw}
          onConvert={(item) => {
            setForm({
              ...EMPTY_OFFER_FORM,
              beatId: item.beat.id,
              buyerEmail: item.requesterEmail || "",
              note: item.requesterNote || "",
              requestId: item.id,
            });
            setDialogOpen(true);
          }}
        />
      ) : (
        <OffersEmptyCard currentTab={currentTab} onCreate={openCreate} />
      )}

      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {offers.length} of {pagination.total}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasPrev}
              onClick={() =>
                router.push(`/studio/offers?tab=${currentTab}&page=${pagination.page - 1}`)
              }
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasNext}
              onClick={() =>
                router.push(`/studio/offers?tab=${currentTab}&page=${pagination.page + 1}`)
              }
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      <CreateOfferDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        beats={beats}
        form={form}
        setForm={setForm}
        saving={saving}
        onSave={handleSave}
        convertingRequest={Boolean(form.requestId)}
      />
    </div>
  );
}
