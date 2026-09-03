"use client";

import { useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import WhatsAppIcon from "@/components/icons/WhatsAppIcon";
import { buildStoreShareText, buildWhatsAppShareUrl } from "@/lib/utils/whatsapp";
import { MAX_HEADLINE_LENGTH } from "@/lib/validators/store";
import type { StoreEditorData } from "@/lib/serializers/store";
import StoreHeadlineField from "./StoreHeadlineField";
import StoreFeaturedPackField from "./StoreFeaturedPackField";
import StorePinPicker from "./StorePinPicker";
import StorePhonePreview from "./StorePhonePreview";

interface StoreEditorClientProps {
  data: StoreEditorData;
  bioLink: string;
}

export default function StoreEditorClient({ data, bioLink }: StoreEditorClientProps) {
  const [headline, setHeadline] = useState(data.store.headline);
  const [showWhatsApp, setShowWhatsApp] = useState(data.store.showWhatsApp);
  const [pinnedBeatIds, setPinnedBeatIds] = useState(data.store.pinnedBeatIds);
  const [featuredPackId, setFeaturedPackId] = useState(data.store.featuredPackId);
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState(false);
  const [headlineError, setHeadlineError] = useState<string>();

  const beatById = useMemo(
    () => new Map(data.beats.map((beat) => [beat._id, beat])),
    [data.beats]
  );
  const packById = useMemo(
    () => new Map(data.packs.map((pack) => [pack._id, pack])),
    [data.packs]
  );

  const pinnedBeats = pinnedBeatIds
    .map((id) => beatById.get(id))
    .filter((beat): beat is NonNullable<typeof beat> => Boolean(beat));
  const featuredPack = featuredPackId ? packById.get(featuredPackId) ?? null : null;

  const copyBioLink = async () => {
    if (!bioLink) return;
    try {
      await navigator.clipboard.writeText(bioLink);
      toast.success("Bio link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  const handleSave = async () => {
    if (headline.length > MAX_HEADLINE_LENGTH) {
      setHeadlineError(`Headline must be at most ${MAX_HEADLINE_LENGTH} characters`);
      return;
    }
    setHeadlineError(undefined);
    setSaving(true);
    try {
      const response = await fetch("/api/studio/store", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headline,
          showWhatsApp,
          pinnedBeatIds,
          featuredPackId,
        }),
      });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        throw new Error(payload?.error || "Could not save store");
      }
      toast.success("Store saved", {
        action: bioLink
          ? {
              label: "Copy bio link",
              onClick: () => {
                navigator.clipboard.writeText(bioLink);
                toast.success("Bio link copied");
              },
            }
          : undefined,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save store");
    } finally {
      setSaving(false);
    }
  };

  const shareUrl = bioLink
    ? buildWhatsAppShareUrl(buildStoreShareText(data.producer.displayName, bioLink))
    : null;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
      <form
        className="space-y-8"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSave();
        }}
      >
        <StoreHeadlineField
          value={headline}
          error={headlineError}
          onChange={(value) => {
            setHeadline(value);
            setHeadlineError(undefined);
          }}
        />

        <div className="flex items-start justify-between gap-4 rounded-xl border border-border/50 p-4">
          <div>
            <Label htmlFor="store-whatsapp">Show WhatsApp</Label>
            <p className="mt-1 text-xs text-muted-foreground">
              {data.producer.hasWhatsApp
                ? "Lets buyers message you from your store."
                : "Add a WhatsApp number in Edit Profile to enable this."}
            </p>
          </div>
          <Switch
            id="store-whatsapp"
            checked={showWhatsApp}
            disabled={!data.producer.hasWhatsApp}
            onCheckedChange={(checked) => setShowWhatsApp(Boolean(checked))}
          />
        </div>

        <StorePinPicker
          beats={data.beats}
          pinnedIds={pinnedBeatIds}
          search={search}
          onSearchChange={setSearch}
          onPinnedIdsChange={setPinnedBeatIds}
        />

        <StoreFeaturedPackField
          packs={data.packs}
          value={featuredPackId}
          onChange={setFeaturedPackId}
        />

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={saving}>
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save store
          </Button>
          <Button type="button" variant="outline" onClick={copyBioLink} disabled={!bioLink}>
            Copy bio link
          </Button>
          {shareUrl && (
            <Button asChild variant="outline">
              <a href={shareUrl} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon className="h-4 w-4" />
                Share on WhatsApp
              </a>
            </Button>
          )}
        </div>
      </form>

      <div className="lg:sticky lg:top-24">
        <p className="mb-3 text-center text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Phone preview
        </p>
        <StorePhonePreview
          displayName={data.producer.displayName}
          username={data.producer.username}
          avatarUrl={data.producer.avatarUrl}
          headline={headline}
          showWhatsApp={showWhatsApp}
          hasWhatsApp={data.producer.hasWhatsApp}
          pinnedBeats={pinnedBeats}
          featuredPack={featuredPack}
        />
      </div>
    </div>
  );
}
