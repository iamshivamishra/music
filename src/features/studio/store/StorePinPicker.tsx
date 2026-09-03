"use client";

import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
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
import { MAX_PINNED_BEATS } from "@/lib/validators/store";
import type { StoreEditorBeat } from "@/lib/serializers/store";

interface StorePinPickerProps {
  beats: StoreEditorBeat[];
  pinnedIds: string[];
  search: string;
  onSearchChange: (value: string) => void;
  onPinnedIdsChange: (ids: string[]) => void;
}

export default function StorePinPicker({
  beats,
  pinnedIds,
  search,
  onSearchChange,
  onPinnedIdsChange,
}: StorePinPickerProps) {
  const beatById = new Map(beats.map((beat) => [beat._id, beat]));
  const pinnedBeats = pinnedIds
    .map((id) => beatById.get(id))
    .filter((beat): beat is StoreEditorBeat => Boolean(beat));

  const query = search.trim().toLowerCase();
  const available = beats.filter((beat) => {
    if (pinnedIds.includes(beat._id)) return false;
    if (!query) return true;
    return beat.title.toLowerCase().includes(query) || beat.genre.toLowerCase().includes(query);
  });

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= pinnedIds.length) return;
    const next = [...pinnedIds];
    [next[index], next[target]] = [next[target], next[index]];
    onPinnedIdsChange(next);
  };

  const add = (id: string | null) => {
    if (!id || pinnedIds.includes(id) || pinnedIds.length >= MAX_PINNED_BEATS) return;
    onPinnedIdsChange([...pinnedIds, id]);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Pinned beats</Label>
        <span className="text-xs text-muted-foreground">
          {pinnedIds.length}/{MAX_PINNED_BEATS}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        Up to three published beats. Order here is the order on your store.
      </p>

      {pinnedBeats.length > 0 && (
        <ul className="space-y-2">
          {pinnedBeats.map((beat, index) => (
            <li
              key={beat._id}
              className="flex items-center gap-2 rounded-lg border border-border/50 bg-card p-2"
            >
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  aria-label={`Move ${beat.title} up`}
                >
                  <ChevronUp className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => move(index, 1)}
                  disabled={index === pinnedBeats.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  aria-label={`Move ${beat.title} down`}
                >
                  <ChevronDown className="h-4 w-4" />
                </button>
              </div>
              {beat.coverUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={beat.coverUrl} alt="" className="h-10 w-10 rounded object-cover" />
              ) : (
                <div className="h-10 w-10 rounded bg-muted" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{beat.title}</p>
                <p className="text-xs text-muted-foreground">{beat.genre}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={`Remove ${beat.title} from pins`}
                onClick={() => onPinnedIdsChange(pinnedIds.filter((id) => id !== beat._id))}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      {pinnedIds.length < MAX_PINNED_BEATS && (
        <div className="space-y-2">
          <Input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search your published beats"
            aria-label="Search beats to pin"
          />
          {available.length > 0 ? (
            <Select onValueChange={add}>
              <SelectTrigger aria-label="Add a pinned beat">
                <SelectValue placeholder="Add a beat" />
              </SelectTrigger>
              <SelectContent>
                {available.slice(0, 20).map((beat) => (
                  <SelectItem key={beat._id} value={beat._id}>
                    {beat.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <Plus className="h-3 w-3" />
              {beats.length === 0
                ? "Publish a beat to pin it here."
                : "No matching beats left to pin."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
