"use client";

import { useEffect, useId, useState } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";

interface RangeFilterProps {
  label: string;
  min: number;
  max: number;
  step: number;
  value: [number, number];
  formatRange: (min: number, max: number) => string;
  onCommit: (value: [number, number]) => void;
}

function toTuple(value: number | readonly number[]): [number, number] | null {
  if (!Array.isArray(value) || value.length < 2) return null;
  return [value[0], value[1]];
}

export function RangeFilter({
  label,
  min,
  max,
  step,
  value,
  formatRange,
  onCommit,
}: RangeFilterProps) {
  const labelId = useId();
  const [draft, setDraft] = useState<[number, number]>(value);

  const [committedMin, committedMax] = value;

  useEffect(() => {
    setDraft([committedMin, committedMax]);
  }, [committedMin, committedMax]);

  return (
    <div className="space-y-3">
      <Label id={labelId} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Slider
        aria-labelledby={labelId}
        min={min}
        max={max}
        step={step}
        value={draft}
        thumbCollisionBehavior="none"
        onValueChange={(next) => {
          const tuple = toTuple(next);
          if (tuple) setDraft(tuple);
        }}
        onValueCommitted={(next) => {
          const tuple = toTuple(next);
          if (tuple) onCommit(tuple);
        }}
      />
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {formatRange(draft[0], draft[1])}
      </p>
    </div>
  );
}
