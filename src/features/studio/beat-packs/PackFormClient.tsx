"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Plus, Trash2, GripVertical, Loader2, Music,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { GENRE_OPTIONS } from "@/lib/validators/beat";
import type { IBeatPack, IBeatPackTier, LicenseType } from "@/types";

interface ProducerBeat {
  _id: string;
  title: string;
  genre: string;
  coverUrl?: string;
}

interface PackFormClientProps {
  producerBeats: ProducerBeat[];
  existingPack?: IBeatPack;
}

const DEFAULT_TIER: IBeatPackTier = {
  type: "basic",
  name: "Basic License",
  price: 499,
  includesWav: false,
  includesStems: false,
  commercialUse: false,
  streamLimit: 5000,
  terms: "Non-exclusive license for personal use.",
  isActive: true,
};

function slugify(str: string) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function PackFormClient({
  producerBeats,
  existingPack,
}: PackFormClientProps) {
  const router = useRouter();
  const isEdit = !!existingPack;

  const [title, setTitle] = useState(existingPack?.title ?? "");
  const [slug, setSlug] = useState(existingPack?.slug ?? "");
  const [description, setDescription] = useState(existingPack?.description ?? "");
  const [genre, setGenre] = useState(existingPack?.genre ?? "");
  const [tags, setTags] = useState(existingPack?.tags?.join(", ") ?? "");
  const [status, setStatus] = useState<"draft" | "published">(
    (existingPack?.status as "draft" | "published") ?? "draft"
  );

  const [selectedBeatIds, setSelectedBeatIds] = useState<string[]>(
    existingPack?.beats?.map((b) => b.beatId.toString()) ?? []
  );

  const [tiers, setTiers] = useState<IBeatPackTier[]>(
    existingPack?.tiers?.length ? existingPack.tiers : [DEFAULT_TIER]
  );

  const [saving, setSaving] = useState(false);
  const [autoSlug, setAutoSlug] = useState(!isEdit);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (autoSlug) setSlug(slugify(val));
  };

  const addBeat = (beatId: string) => {
    if (!selectedBeatIds.includes(beatId)) {
      setSelectedBeatIds((prev) => [...prev, beatId]);
    }
  };

  const removeBeat = (beatId: string) => {
    setSelectedBeatIds((prev) => prev.filter((id) => id !== beatId));
  };

  const moveBeat = (idx: number, direction: -1 | 1) => {
    const newIds = [...selectedBeatIds];
    const target = idx + direction;
    if (target < 0 || target >= newIds.length) return;
    [newIds[idx], newIds[target]] = [newIds[target], newIds[idx]];
    setSelectedBeatIds(newIds);
  };

  const addTier = () => {
    const usedTypes = new Set(tiers.map((t) => t.type));
    const nextType = (["basic", "premium", "unlimited"] as LicenseType[]).find(
      (t) => !usedTypes.has(t)
    );
    if (!nextType) {
      toast.info("Maximum 3 tiers");
      return;
    }
    setTiers((prev) => [
      ...prev,
      {
        ...DEFAULT_TIER,
        type: nextType,
        name: `${nextType.charAt(0).toUpperCase() + nextType.slice(1)} License`,
        price: nextType === "premium" ? 999 : nextType === "unlimited" ? 1999 : 499,
      },
    ]);
  };

  const updateTier = (idx: number, field: string, value: unknown) => {
    setTiers((prev) =>
      prev.map((t, i) => (i === idx ? { ...t, [field]: value } : t))
    );
  };

  const removeTier = (idx: number) => {
    if (tiers.length <= 1) {
      toast.error("At least one tier is required");
      return;
    }
    setTiers((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!slug.trim()) { toast.error("Slug is required"); return; }
    if (!genre) { toast.error("Genre is required"); return; }
    if (tiers.length === 0) { toast.error("At least one tier is required"); return; }

    setSaving(true);
    try {
      const body = {
        title: title.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        genre,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        beats: selectedBeatIds.map((id, i) => ({ beatId: id, position: i })),
        tiers,
        status,
      };

      const url = isEdit
        ? `/api/beat-packs/${existingPack!.slug}`
        : "/api/beat-packs";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to save");
        return;
      }

      toast.success(isEdit ? "Pack updated" : "Pack created");
      router.push("/studio/beat-packs");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const availableBeats = producerBeats.filter(
    (b) => !selectedBeatIds.includes(b._id)
  );

  return (
    <div className="max-w-3xl space-y-6">
      {/* Basic info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pack Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Title</Label>
            <Input
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              placeholder="e.g. Midnight Trap Pack"
            />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setAutoSlug(false);
              }}
              placeholder="e.g. midnight-trap-pack"
            />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe your pack..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Genre</Label>
              <Select value={genre} onValueChange={(v) => setGenre(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select genre" />
                </SelectTrigger>
                <SelectContent>
                  {GENRE_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "draft" | "published")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Tags (comma-separated)</Label>
            <Input
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="trap, dark, 808"
            />
          </div>
        </CardContent>
      </Card>

      {/* Beat selector */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Beats ({selectedBeatIds.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {selectedBeatIds.length > 0 && (
            <div className="space-y-2">
              {selectedBeatIds.map((beatId, idx) => {
                const beat = producerBeats.find((b) => b._id === beatId);
                if (!beat) return null;
                return (
                  <div
                    key={beatId}
                    className="flex items-center gap-3 rounded-lg border border-border/50 p-2"
                  >
                    <div className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => moveBeat(idx, -1)}
                        disabled={idx === 0}
                        className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                        aria-label="Move up"
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
                    </div>
                    <span className="w-6 text-center text-xs text-muted-foreground">{idx + 1}</span>
                    {beat.coverUrl ? (
                      <img src={beat.coverUrl} alt="" className="h-8 w-8 rounded object-cover" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded bg-muted">
                        <Music className="h-3 w-3 text-muted-foreground" />
                      </div>
                    )}
                    <span className="flex-1 truncate text-sm font-medium">{beat.title}</span>
                    <span className="text-xs text-muted-foreground">{beat.genre}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      aria-label={`Remove ${beat.title} from pack`}
                      onClick={() => removeBeat(beatId)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {availableBeats.length > 0 && (
            <Select onValueChange={(v: string | null) => { if (v) addBeat(v); }}>
              <SelectTrigger>
                <SelectValue placeholder="Add a beat..." />
              </SelectTrigger>
              <SelectContent>
                {availableBeats.map((b) => (
                  <SelectItem key={b._id} value={b._id}>
                    {b.title} — {b.genre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </CardContent>
      </Card>

      {/* Tiers */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Pricing Tiers ({tiers.length}/3)</CardTitle>
          {tiers.length < 3 && (
            <Button variant="outline" size="sm" onClick={addTier}>
              <Plus className="mr-1 h-3.5 w-3.5" />
              Add Tier
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          {tiers.map((tier, idx) => (
            <div key={idx} className="space-y-3 rounded-lg border border-border/50 p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold capitalize">{tier.type}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-destructive"
                  aria-label={`Remove ${tier.type} tier`}
                  onClick={() => removeTier(idx)}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Name</Label>
                  <Input
                    value={tier.name}
                    onChange={(e) => updateTier(idx, "name", e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Price (₹)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={tier.price}
                    onChange={(e) => updateTier(idx, "price", Number(e.target.value))}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Stream Limit (0 = unlimited)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={tier.streamLimit}
                    onChange={(e) => updateTier(idx, "streamLimit", Number(e.target.value))}
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={tier.includesWav}
                    onChange={(e) => updateTier(idx, "includesWav", e.target.checked)}
                    className="rounded"
                  />
                  WAV
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={tier.includesStems}
                    onChange={(e) => updateTier(idx, "includesStems", e.target.checked)}
                    className="rounded"
                  />
                  Stems
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={tier.commercialUse}
                    onChange={(e) => updateTier(idx, "commercialUse", e.target.checked)}
                    className="rounded"
                  />
                  Commercial Use
                </label>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Terms</Label>
                <Textarea
                  value={tier.terms}
                  onChange={(e) => updateTier(idx, "terms", e.target.value)}
                  rows={2}
                  className="text-sm"
                />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Submit */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : isEdit ? (
            "Update Pack"
          ) : (
            "Create Pack"
          )}
        </Button>
      </div>
    </div>
  );
}
