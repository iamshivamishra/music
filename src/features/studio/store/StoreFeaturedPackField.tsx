"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormField } from "@/components/ui/form-field";
import type { StoreEditorPack } from "@/lib/serializers/store";

interface StoreFeaturedPackFieldProps {
  packs: StoreEditorPack[];
  value: string | null;
  onChange: (packId: string | null) => void;
}

export default function StoreFeaturedPackField({
  packs,
  value,
  onChange,
}: StoreFeaturedPackFieldProps) {
  return (
    <FormField label="Featured pack" htmlFor="store-pack">
      <Select
        value={value ?? "none"}
        onValueChange={(next) => onChange(next && next !== "none" ? next : null)}
      >
        <SelectTrigger id="store-pack">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="none">None</SelectItem>
          {packs.map((pack) => (
            <SelectItem key={pack._id} value={pack._id}>
              {pack.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </FormField>
  );
}
