"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import type { BeatLicenseType } from "@/types";

export interface OfferBeatOption {
  id: string;
  title: string;
}

export interface CreateOfferForm {
  beatId: string;
  licenseType: BeatLicenseType;
  amount: string;
  expiresInHours: string;
  buyerEmail: string;
  note: string;
  requestId?: string;
}

export const EMPTY_OFFER_FORM: CreateOfferForm = {
  beatId: "",
  licenseType: "unlimited",
  amount: "",
  expiresInHours: "48",
  buyerEmail: "",
  note: "",
};

interface CreateOfferDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  beats: OfferBeatOption[];
  form: CreateOfferForm;
  setForm: (form: CreateOfferForm) => void;
  saving: boolean;
  onSave: () => void;
  convertingRequest: boolean;
}

export function CreateOfferDialog({
  open,
  onOpenChange,
  beats,
  form,
  setForm,
  saving,
  onSave,
  convertingRequest,
}: CreateOfferDialogProps) {
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleSave = () => {
    const next: Record<string, string> = {};
    if (!form.beatId) next.beatId = "Pick a beat";
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount < 100) next.amount = "Minimum ₹100";
    if (amount > 500_000) next.amount = "Maximum ₹5,00,000";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSave();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {convertingRequest ? "Send a pay link" : "Create offer"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="offer-beat">Beat</Label>
            <Select
              value={form.beatId || undefined}
              onValueChange={(value) => {
                if (value) setForm({ ...form, beatId: value });
              }}
              disabled={convertingRequest}
            >
              <SelectTrigger
                id="offer-beat"
                aria-invalid={!!errors.beatId}
                aria-describedby={errors.beatId ? "offer-beat-error" : undefined}
              >
                <SelectValue placeholder="Select a beat" />
              </SelectTrigger>
              <SelectContent>
                {beats.map((beat) => (
                  <SelectItem key={beat.id} value={beat.id}>
                    {beat.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.beatId && (
              <p id="offer-beat-error" role="alert" className="text-xs text-destructive">
                {errors.beatId}
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>License</Label>
              <Select
                value={form.licenseType}
                onValueChange={(value) => {
                  if (value) {
                    setForm({ ...form, licenseType: value as BeatLicenseType });
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="basic">Basic</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="unlimited">Unlimited</SelectItem>
                  <SelectItem value="exclusive">Exclusive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-amount">Amount (₹)</Label>
              <Input
                id="offer-amount"
                type="number"
                min={100}
                max={500000}
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                aria-invalid={!!errors.amount}
                aria-describedby={errors.amount ? "offer-amount-error" : undefined}
              />
              {errors.amount && (
                <p id="offer-amount-error" role="alert" className="text-xs text-destructive">
                  {errors.amount}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="offer-expiry">Expires (hours)</Label>
              <Input
                id="offer-expiry"
                type="number"
                min={1}
                max={168}
                value={form.expiresInHours}
                onChange={(e) => setForm({ ...form, expiresInHours: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="offer-email">Buyer email (optional)</Label>
              <Input
                id="offer-email"
                type="email"
                value={form.buyerEmail}
                onChange={(e) => setForm({ ...form, buyerEmail: e.target.value })}
                placeholder="artist@email.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="offer-note">Note (optional)</Label>
            <Textarea
              id="offer-note"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
              maxLength={500}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : convertingRequest ? (
              "Create pay link"
            ) : (
              "Create offer"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
