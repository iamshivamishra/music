"use client";

import { useRef } from "react";
import { X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";

export interface FileSlot {
  file: File | null;
  progress: number;
  status: "idle" | "uploading" | "done" | "error";
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

interface FileUploadSlotProps {
  label: string;
  accept: string;
  slot: FileSlot;
  onSelect: (file: File) => void;
  onClear: () => void;
  icon: React.ReactNode;
  required?: boolean;
  hint?: string;
}

export function FileUploadSlot({
  label,
  accept,
  slot,
  onSelect,
  onClear,
  icon,
  required = false,
  hint,
}: FileUploadSlotProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onSelect(f);
        }}
      />
      <div
        onClick={() => inputRef.current?.click()}
        className="flex cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border/70 bg-background/60 p-4 transition-colors hover:border-primary/50 hover:bg-accent/30"
      >
        <div className="shrink-0 text-muted-foreground">{icon}</div>
        <div className="flex-1 min-w-0">
          {slot.file ? (
            <div>
              <p className="truncate text-sm font-medium">{slot.file.name}</p>
              <p className="text-xs text-muted-foreground">{formatSize(slot.file.size)}</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-muted-foreground">Click to select</p>
              {hint && <p className="text-xs text-muted-foreground/70">{hint}</p>}
            </div>
          )}
        </div>
        {slot.status === "done" && (
          <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" />
        )}
        {slot.file && slot.status === "idle" && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onClear();
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      {slot.status === "uploading" && (
        <Progress value={slot.progress} className="h-1.5" />
      )}
    </div>
  );
}
