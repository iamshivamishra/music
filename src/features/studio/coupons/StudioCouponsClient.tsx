"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Ticket, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CouponForm, EMPTY_COUPON_FORM, type CouponFormData } from "@/features/studio/CouponForm";
import { CouponTableRow } from "@/features/studio/CouponTableRow";
import type { ICoupon, CouponStatus } from "@/types";

const STATUS_TABS = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "draft", label: "Drafts" },
  { value: "paused", label: "Paused" },
  { value: "scheduled", label: "Scheduled" },
];

interface Props {
  coupons: ICoupon[];
  pagination: {
    page: number;
    totalPages: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  currentStatus: string;
  prefillEmail?: string;
}

export default function StudioCouponsClient({
  coupons,
  pagination,
  currentStatus,
  prefillEmail,
}: Props) {
  const router = useRouter();
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<CouponFormData>(EMPTY_COUPON_FORM);

  useEffect(() => {
    if (!prefillEmail) return;
    setEditingId(null);
    setForm({ ...EMPTY_COUPON_FORM, restrictEmail: prefillEmail });
    setDialogOpen(true);
  }, [prefillEmail]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_COUPON_FORM);
    setDialogOpen(true);
  };

  const openEdit = (coupon: ICoupon) => {
    setEditingId(coupon._id.toString());
    setForm({
      code: coupon.code,
      type: coupon.type,
      value: coupon.value.toString(),
      maxDiscount: coupon.maxDiscount?.toString() ?? "",
      minOrderAmount: coupon.minOrderAmount?.toString() ?? "",
      status: coupon.status,
      usageLimit: coupon.usageLimit?.toString() ?? "",
      expiresAt: coupon.expiresAt
        ? new Date(coupon.expiresAt).toISOString().split("T")[0]
        : "",
      restrictEmail: coupon.emailRestrictions?.[0] ?? "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        type: form.type,
        value: Number(form.value),
        status: form.status,
      };
      if (!editingId) body.code = form.code;
      if (form.maxDiscount) body.maxDiscount = Number(form.maxDiscount);
      if (form.minOrderAmount) body.minOrderAmount = Number(form.minOrderAmount);
      if (form.usageLimit) body.usageLimit = Number(form.usageLimit);
      if (form.expiresAt) body.expiresAt = form.expiresAt;
      const restrictEmail = form.restrictEmail.trim().toLowerCase();
      body.emailRestrictions = restrictEmail ? [restrictEmail] : [];

      const url = editingId ? `/api/coupons/${editingId}` : "/api/coupons";
      const method = editingId ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => null);
        toast.error(err?.error || "Failed to save coupon");
        return;
      }

      toast.success(editingId ? "Coupon updated" : "Coupon created");
      setDialogOpen(false);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusToggle = async (coupon: ICoupon) => {
    const newStatus: CouponStatus =
      coupon.status === "active" ? "paused" : "active";
    setActionLoading(coupon._id.toString());
    try {
      const res = await fetch(`/api/coupons/${coupon._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        toast.error("Failed to update status");
        return;
      }
      toast.success(newStatus === "active" ? "Coupon activated" : "Coupon paused");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (coupon: ICoupon) => {
    if (!confirm(`Delete coupon "${coupon.code}"? This cannot be undone.`)) return;
    setActionLoading(coupon._id.toString());
    try {
      const res = await fetch(`/api/coupons/${coupon._id}`, { method: "DELETE" });
      if (!res.ok) {
        toast.error("Failed to delete coupon");
        return;
      }
      toast.success("Coupon deleted");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setActionLoading(null);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied");
  };

  const navigateStatus = (status: string) => {
    const params = new URLSearchParams();
    if (status !== "all") params.set("status", status);
    router.push(`/studio/coupons?${params.toString()}`);
  };

  const navigatePage = (page: number) => {
    const params = new URLSearchParams();
    if (currentStatus !== "all") params.set("status", currentStatus);
    params.set("page", page.toString());
    router.push(`/studio/coupons?${params.toString()}`);
  };

  return (
    <div className="page-shell">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Coupons</h1>
          <p className="text-muted-foreground">Create and manage discount codes for your packs</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Coupon
        </Button>
      </div>

      {/* Status tabs */}
      <div className="mb-6 flex items-center gap-1 rounded-xl border border-border/50 bg-card/60 p-1.5 w-fit shadow-sm">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => navigateStatus(tab.value)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              currentStatus === tab.value
                ? "bg-primary/90 text-primary-foreground"
                : "text-muted-foreground hover:bg-accent"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Table */}
      {coupons.length > 0 ? (
        <Card className="overflow-hidden rounded-2xl border-border/50 bg-card/80 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Code</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="hidden sm:table-cell">Value</TableHead>
                <TableHead className="hidden md:table-cell">Used</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Expires</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {coupons.map((coupon) => (
                <CouponTableRow
                  key={coupon._id.toString()}
                  coupon={coupon}
                  actionLoading={actionLoading === coupon._id.toString()}
                  onEdit={openEdit}
                  onCopyCode={copyCode}
                  onStatusToggle={handleStatusToggle}
                  onDelete={handleDelete}
                />
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <Card className="rounded-2xl border-border/50 bg-card/60 shadow-sm">
          <CardContent className="flex flex-col items-center py-16">
            <Ticket className="mb-3 h-12 w-12 text-muted-foreground" />
            <p className="text-lg font-medium">
              {currentStatus === "all" ? "No coupons yet" : `No ${currentStatus} coupons`}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Create your first coupon to offer discounts on your packs.
            </p>
            {currentStatus === "all" && (
              <Button className="mt-4" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Create Coupon
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {coupons.length} of {pagination.total} coupons
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasPrev}
              onClick={() => navigatePage(pagination.page - 1)}
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm text-muted-foreground">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={!pagination.hasNext}
              onClick={() => navigatePage(pagination.page + 1)}
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <CouponForm
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editingId={editingId}
        form={form}
        setForm={setForm}
        saving={saving}
        onSave={handleSave}
      />
    </div>
  );
}
