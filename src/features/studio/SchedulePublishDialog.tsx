"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { utcToIstDatetimeLocal } from "@/lib/datetime/ist";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  initialValue?: Date | string;
  confirmLabel?: string;
  onConfirm: (publishAtLocal: string) => void;
}

export function SchedulePublishDialog({
  open,
  onOpenChange,
  title = "Schedule publish",
  description = "The beat stays hidden until this time, then goes live automatically.",
  initialValue,
  confirmLabel = "Schedule",
  onConfirm,
}: Props) {
  const defaultLocal = initialValue
    ? utcToIstDatetimeLocal(new Date(initialValue))
    : utcToIstDatetimeLocal(new Date(Date.now() + 60 * 60 * 1000));
  const [value, setValue] = useState(defaultLocal);

  useEffect(() => {
    if (!open) return;
    setValue(
      initialValue
        ? utcToIstDatetimeLocal(new Date(initialValue))
        : utcToIstDatetimeLocal(new Date(Date.now() + 60 * 60 * 1000))
    );
  }, [open, initialValue]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor="publish-at">Go live at (India time, IST)</Label>
          <Input
            id="publish-at"
            type="datetime-local"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
          />
        </div>
        <Button
          onClick={() => {
            onConfirm(value);
            onOpenChange(false);
          }}
          disabled={!value}
        >
          {confirmLabel}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
