"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import { Plus, Trash2 } from "lucide-react";

export interface ExtraDraft {
  name: string;
  price: string;
}

interface Props {
  extras: ExtraDraft[];
  onAdd: () => void;
  onUpdate: (index: number, field: keyof ExtraDraft, value: string) => void;
  onRemove: (index: number) => void;
}

export function ServiceExtrasFields({ extras, onAdd, onUpdate, onRemove }: Props) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Extras (optional, max 5)</p>
        <Button type="button" size="sm" variant="outline" onClick={onAdd} disabled={extras.length >= 5}>
          <Plus className="h-4 w-4" />
          Add extra
        </Button>
      </div>
      {extras.map((extra, index) => (
        <div key={index} className="flex items-end gap-2">
          <FormField label="Name" htmlFor={`extra-name-${index}`} className="flex-1">
            <Input
              id={`extra-name-${index}`}
              value={extra.name}
              onChange={(e) => onUpdate(index, "name", e.target.value)}
              maxLength={80}
            />
          </FormField>
          <FormField label="Price (₹)" htmlFor={`extra-price-${index}`} className="w-32">
            <Input
              id={`extra-price-${index}`}
              type="number"
              min={1}
              value={extra.price}
              onChange={(e) => onUpdate(index, "price", e.target.value)}
            />
          </FormField>
          <Button
            type="button"
            size="icon"
            variant="outline"
            aria-label={`Remove extra ${index + 1}`}
            onClick={() => onRemove(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  );
}
