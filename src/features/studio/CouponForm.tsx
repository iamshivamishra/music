"use client";

import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import type { CouponStatus, CouponType } from "@/types";

export interface CouponFormData {
  code: string;
  type: CouponType;
  value: string;
  maxDiscount: string;
  minOrderAmount: string;
  status: CouponStatus;
  usageLimit: string;
  expiresAt: string;
  restrictEmail: string;
}

export const EMPTY_COUPON_FORM: CouponFormData = {
  code: "",
  type: "percent" as CouponType,
  value: "",
  maxDiscount: "",
  minOrderAmount: "",
  status: "draft" as CouponStatus,
  usageLimit: "",
  expiresAt: "",
  restrictEmail: "",
};

interface CouponFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingId: string | null;
  form: CouponFormData;
  setForm: (form: CouponFormData) => void;
  saving: boolean;
  onSave: () => void;
}

export function CouponForm({
  open,
  onOpenChange,
  editingId,
  form,
  setForm,
  saving,
  onSave,
}: CouponFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingId ? "Edit Coupon" : "Create Coupon"}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          {!editingId && (
            <div className="space-y-2">
              <Label htmlFor="coupon-code">Code</Label>
              <Input
                id="coupon-code"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="e.g. SUMMER25"
                maxLength={30}
                className="font-mono"
              />
            </div>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Discount Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v as CouponType })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percent">Percentage</SelectItem>
                  <SelectItem value="flat">Flat Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-value">
                {form.type === "percent" ? "Discount %" : "Discount ₹"}
              </Label>
              <Input
                id="coupon-value"
                type="number"
                min={0}
                max={form.type === "percent" ? 100 : undefined}
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {form.type === "percent" && (
              <div className="space-y-2">
                <Label htmlFor="coupon-max">Max Discount (₹)</Label>
                <Input
                  id="coupon-max"
                  type="number"
                  min={0}
                  value={form.maxDiscount}
                  onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="coupon-min-order">Min Order (₹)</Label>
              <Input
                id="coupon-min-order"
                type="number"
                min={0}
                value={form.minOrderAmount}
                onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                placeholder="Optional"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as CouponStatus })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="paused">Paused</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-limit">Usage Limit</Label>
              <Input
                id="coupon-limit"
                type="number"
                min={1}
                value={form.usageLimit}
                onChange={(e) => setForm({ ...form, usageLimit: e.target.value })}
                placeholder="Unlimited"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="coupon-expires">Expires</Label>
            <Input
              id="coupon-expires"
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coupon-restrict-email">Restrict to email</Label>
            <Input
              id="coupon-restrict-email"
              type="email"
              value={form.restrictEmail}
              onChange={(e) => setForm({ ...form, restrictEmail: e.target.value })}
              placeholder="Optional — one buyer email"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={saving || !form.value}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editingId ? "Save Changes" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
