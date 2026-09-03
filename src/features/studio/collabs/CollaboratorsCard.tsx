"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Loader2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { BeatSplitsDto } from "@/lib/serializers/collab";
import { CollaboratorDraftFields, type CollaboratorDraft } from "./CollaboratorDraftFields";
import { ProducerSearchField, type ProducerSearchHit } from "./ProducerSearchField";
import { CollaboratorStatusList } from "./CollaboratorStatusList";
import { isFeatureEnabled } from "@/lib/feature-flags";

export default function CollaboratorsCard({ beatId }: { beatId: string }) {
  const enabled = isFeatureEnabled("collabSplits");
  const [splits, setSplits] = useState<BeatSplitsDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ownerSharePercent, setOwnerSharePercent] = useState("70");
  const [drafts, setDrafts] = useState<CollaboratorDraft[]>([
    { username: "", sharePercent: "30" },
  ]);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ProducerSearchHit[]>([]);

  const load = useCallback(async () => {
    if (!enabled) return;
    const res = await fetch(`/api/beats/${beatId}/collaborators`);
    if (!res.ok) return;
    const data = (await res.json()) as BeatSplitsDto;
    setSplits(data);
    setOwnerSharePercent(String(data.ownerSharePercent || 70));
    if (data.collaborators.length > 0) {
      setDrafts(
        data.collaborators.map((collaborator) => ({
          username: collaborator.username ?? "",
          sharePercent: String(collaborator.sharePercent),
        }))
      );
    }
  }, [beatId, enabled]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (query.length < 1) {
      setHits([]);
      return;
    }
    const timer = setTimeout(async () => {
      const res = await fetch(`/api/producers/search?q=${encodeURIComponent(query)}`);
      if (!res.ok) return;
      const body = (await res.json()) as { data: ProducerSearchHit[] };
      setHits(body.data);
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const percentSum =
    Number(ownerSharePercent || 0) +
    drafts.reduce((sum, draft) => sum + Number(draft.sharePercent || 0), 0);

  async function sendInvites() {
    setSaving(true);
    try {
      const res = await fetch(`/api/beats/${beatId}/collaborators`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerSharePercent: Number(ownerSharePercent),
          collaborators: drafts
            .filter((draft) => draft.username.trim())
            .map((draft) => ({
              username: draft.username.trim(),
              sharePercent: Number(draft.sharePercent),
            })),
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast.error(body.error || "Could not send invites");
        return;
      }
      setSplits(body);
      toast.success("Invites sent. Split stays inactive until everyone accepts.");
    } finally {
      setSaving(false);
    }
  }

  async function patchSettings(payload: { showCollabCredits?: boolean; cancel?: true }) {
    const res = await fetch(`/api/beats/${beatId}/collaborators`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      toast.error("Could not update collaborators");
      return;
    }
    const data = (await res.json()) as BeatSplitsDto;
    setSplits(data);
  }

  function selectProducer(username: string) {
    setDrafts((current) => {
      const next = [...current];
      const emptyIndex = next.findIndex((row) => !row.username);
      if (emptyIndex >= 0) {
        next[emptyIndex] = { ...next[emptyIndex], username };
        return next;
      }
      if (next.length >= 2) return next;
      return [...next, { username, sharePercent: "20" }];
    });
    setQuery("");
    setHits([]);
  }

  if (!enabled) return null;

  if (loading) {
    return (
      <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
        <CardContent className="flex items-center gap-2 p-6 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading collaborators…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="h-5 w-5 text-primary" />
          Collaborators
        </CardTitle>
        <CardDescription>
          Split future sales with up to two producers. Percents must include you and sum to 100.
          Current status: {splits?.splitsStatus ?? "inactive"}.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="owner-share">Your share %</Label>
            <Input
              id="owner-share"
              inputMode="numeric"
              value={ownerSharePercent}
              onChange={(event) => setOwnerSharePercent(event.target.value)}
              aria-describedby="split-sum"
            />
          </div>
          <ProducerSearchField
            query={query}
            hits={hits}
            onQueryChange={setQuery}
            onSelect={selectProducer}
          />
        </div>

        <CollaboratorDraftFields drafts={drafts} onDraftsChange={setDrafts} />

        <p id="split-sum" className="text-sm text-muted-foreground">
          Total: {percentSum}% {percentSum === 100 ? "" : "(must equal 100)"}
        </p>

        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" disabled={saving || percentSum !== 100} onClick={sendInvites}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Send invites
          </Button>
          {(splits?.collaborators.length ?? 0) > 0 && (
            <Button type="button" variant="outline" size="sm" onClick={() => patchSettings({ cancel: true })}>
              Clear splits
            </Button>
          )}
        </div>

        {splits && <CollaboratorStatusList collaborators={splits.collaborators} />}

        <div className="flex items-center justify-between rounded-md border border-border/50 px-3 py-2">
          <Label htmlFor="show-credits">Show ft. credits on the beat page</Label>
          <Switch
            id="show-credits"
            checked={splits?.showCollabCredits !== false}
            onCheckedChange={(checked) => patchSettings({ showCollabCredits: checked })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
