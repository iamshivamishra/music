"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface ProducerSearchHit {
  id: string;
  username: string;
  displayName: string;
}

interface ProducerSearchFieldProps {
  query: string;
  hits: ProducerSearchHit[];
  onQueryChange: (value: string) => void;
  onSelect: (username: string) => void;
}

export function ProducerSearchField({
  query,
  hits,
  onQueryChange,
  onSelect,
}: ProducerSearchFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor="collab-search">Find producer</Label>
      <Input
        id="collab-search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        placeholder="Username"
        autoComplete="off"
      />
      {hits.length > 0 && (
        <ul className="rounded-md border border-border/50 bg-background p-1">
          {hits.map((hit) => (
            <li key={hit.id}>
              <button
                type="button"
                className="w-full rounded-md px-2 py-1.5 text-left text-sm hover:bg-muted"
                onClick={() => onSelect(hit.username)}
              >
                @{hit.username} · {hit.displayName}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
