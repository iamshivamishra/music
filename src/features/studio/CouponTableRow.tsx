"use client";

import {
  Pencil, Trash2, MoreHorizontal, Loader2,
  Copy, Pause, Play,
} from "lucide-react";
import { TableCell, TableRow } from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CouponStatusBadge } from "./CouponStatusBadge";
import type { ICoupon } from "@/types";

function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface CouponTableRowProps {
  coupon: ICoupon;
  actionLoading: boolean;
  onEdit: (coupon: ICoupon) => void;
  onCopyCode: (code: string) => void;
  onStatusToggle: (coupon: ICoupon) => void;
  onDelete: (coupon: ICoupon) => void;
}

export function CouponTableRow({
  coupon,
  actionLoading,
  onEdit,
  onCopyCode,
  onStatusToggle,
  onDelete,
}: CouponTableRowProps) {
  return (
    <TableRow>
      <TableCell>
        <button
          onClick={() => onCopyCode(coupon.code)}
          className="flex items-center gap-1.5 font-mono text-sm font-medium hover:text-primary transition-colors"
          title="Click to copy"
        >
          {coupon.code}
          <Copy className="h-3 w-3 text-muted-foreground" />
        </button>
      </TableCell>
      <TableCell className="capitalize">{coupon.type}</TableCell>
      <TableCell className="hidden sm:table-cell">
        {coupon.value != null
          ? coupon.type === "percent"
            ? `${coupon.value}%`
            : `₹${coupon.value}`
          : "—"}
        {coupon.maxDiscount != null && (
          <span className="text-xs text-muted-foreground ml-1">
            (max ₹{coupon.maxDiscount})
          </span>
        )}
      </TableCell>
      <TableCell className="hidden md:table-cell text-muted-foreground">
        {coupon.usageCount}
        {coupon.usageLimit && ` / ${coupon.usageLimit}`}
      </TableCell>
      <TableCell><CouponStatusBadge status={coupon.status} /></TableCell>
      <TableCell className="hidden sm:table-cell text-xs text-muted-foreground">
        {coupon.expiresAt ? formatDate(coupon.expiresAt) : "—"}
      </TableCell>
      <TableCell className="py-2">
        {actionLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <MoreHorizontal className="h-4 w-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(coupon)}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onCopyCode(coupon.code)}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Code
              </DropdownMenuItem>
              {(coupon.status === "active" || coupon.status === "paused") && (
                <DropdownMenuItem onClick={() => onStatusToggle(coupon)}>
                  {coupon.status === "active" ? (
                    <>
                      <Pause className="mr-2 h-4 w-4" />
                      Pause
                    </>
                  ) : (
                    <>
                      <Play className="mr-2 h-4 w-4" />
                      Activate
                    </>
                  )}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => onDelete(coupon)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </TableCell>
    </TableRow>
  );
}
