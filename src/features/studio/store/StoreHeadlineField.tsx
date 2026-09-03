"use client";

import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { MAX_HEADLINE_LENGTH } from "@/lib/validators/store";

interface StoreHeadlineFieldProps {
  value: string;
  error?: string;
  onChange: (value: string) => void;
}

export default function StoreHeadlineField({
  value,
  error,
  onChange,
}: StoreHeadlineFieldProps) {
  return (
    <FormField label="Headline" htmlFor="store-headline" error={error}>
      <Input
        id="store-headline"
        value={value}
        maxLength={MAX_HEADLINE_LENGTH}
        onChange={(event) => onChange(event.target.value)}
        placeholder="New drops every Friday"
        aria-invalid={Boolean(error)}
        aria-describedby="headline-count"
      />
      <p id="headline-count" className="text-xs text-muted-foreground">
        {value.length}/{MAX_HEADLINE_LENGTH}
      </p>
    </FormField>
  );
}
