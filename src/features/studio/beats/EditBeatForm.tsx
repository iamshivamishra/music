"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
  Loader2, Save, ArrowLeft, Music, Eye, EyeOff, Trash2, Archive,
  Upload, CheckCircle2, RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import LicenseEditor from "@/components/LicenseEditor";
import CollaboratorsCard from "@/features/studio/collabs/CollaboratorsCard";
import PublishSuccessCard from "@/features/studio/beats/PublishSuccessCard";
import { SchedulePublishDialog } from "@/features/studio/SchedulePublishDialog";
import { copyPrivateBeatLink } from "@/lib/beats/private-link";
import { istDatetimeLocalToUtc } from "@/lib/datetime/ist";
import { GENRE_OPTIONS, KEY_OPTIONS, MOOD_OPTIONS } from "@/lib/validators/beat";
import { canEnableFreeDownload } from "@/lib/free-download";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { FILE_LIMITS } from "@/lib/storage/limits";
import { uploadFile as uploadBeatFile } from "@/lib/upload-client";
import type { IBeat, ILicense, BeatStatus } from "@/types";
import type { BeatFileCategory } from "@/lib/storage/keys";

const CATEGORY_URL_FIELD: Record<BeatFileCategory, string> = {
  preview: "audioTaggedUrl",
  master: "audioFullUrl",
  stems: "stemsUrl",
  artwork: "coverUrl",
};

interface Props {
  beat: IBeat;
  licenses: ILicense[];
}

function statusLabel(status: BeatStatus) {
  switch (status) {
    case "published": return "Published";
    case "unlisted": return "Unlisted";
    case "scheduled": return "Scheduled";
    case "draft": return "Draft";
    case "archived": return "Archived";
    default: return status;
  }
}

export default function EditBeatForm({ beat, licenses }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showPublishSuccess, setShowPublishSuccess] = useState(false);

  const [title, setTitle] = useState(beat.title);
  const [description, setDescription] = useState(beat.description || "");
  const [genre, setGenre] = useState(beat.genre);
  const [bpm, setBpm] = useState(beat.bpm?.toString() || "");
  const [key, setKey] = useState(beat.key || "");
  const [mood, setMood] = useState(beat.mood || "");
  const [tags, setTags] = useState(beat.tags.join(", "));
  const [status, setStatus] = useState<BeatStatus>(beat.status);
  const [privateToken, setPrivateToken] = useState(beat.privateToken);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [freeDownloadEnabled, setFreeDownloadEnabled] = useState(
    Boolean(beat.freeDownloadEnabled)
  );

  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [fileReplace, setFileReplace] = useState<
    Record<string, { file: File | null; progress: number; status: "idle" | "uploading" | "done" | "error" }>
  >({});

  const replaceFile = useCallback(
    async (category: BeatFileCategory, file: File) => {
      const limits = FILE_LIMITS[category];
      if (file.size > limits.maxSize) {
        toast.error(`File exceeds the ${(limits.maxSize / (1024 * 1024)).toFixed(0)} MB limit`);
        return;
      }

      setFileReplace((prev) => ({
        ...prev,
        [category]: { file, progress: 0, status: "uploading" },
      }));

      try {
        const { url: publicUrl, key } = await uploadBeatFile(
          file,
          category,
          beat._id.toString(),
          (pct) => {
            setFileReplace((prev) => ({
              ...prev,
              [category]: { ...prev[category], progress: pct },
            }));
          },
          { replace: true }
        );

        const patchBody: Record<string, unknown> = {
          [CATEGORY_URL_FIELD[category]]: publicUrl,
          [`storageKeys.${category}`]: key,
        };

        const patchRes = await fetch(`/api/beats/${beat._id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchBody),
        });

        if (!patchRes.ok) {
          throw new Error("File uploaded but failed to update beat record");
        }

        setFileReplace((prev) => ({
          ...prev,
          [category]: { ...prev[category], progress: 100, status: "done" },
        }));
        toast.success(`${category} file replaced`);
        router.refresh();
      } catch (err) {
        const message = err instanceof Error ? err.message : "Replace failed";
        toast.error(message);
        setFileReplace((prev) => ({
          ...prev,
          [category]: { ...prev[category], status: "error" },
        }));
      }
    },
    [beat._id, router]
  );

  const handleSave = async () => {
    setSaving(true);
    try {
      const body: Record<string, unknown> = {
        title,
        description: description || undefined,
        genre,
        tags: tags ? tags.split(",").map((t) => t.trim()).filter(Boolean) : [],
        status,
        isPublished: status === "published",
        freeDownloadEnabled: isFeatureEnabled("freeDownloadLeads")
          ? freeDownloadEnabled
          : false,
      };
      if (bpm) body.bpm = Number(bpm);
      if (key) body.key = key;
      if (mood) body.mood = mood;

      const res = await fetch(`/api/beats/${beat._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to save");
        return;
      }

      if (status === "published" && beat.status !== "published") {
        setShowPublishSuccess(true);
      }
      toast.success("Beat saved");
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (
    newStatus: BeatStatus,
    publishAt?: Date
  ) => {
    const res = await fetch(`/api/beats/${beat._id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: newStatus,
        publishAt: publishAt?.toISOString(),
      }),
    });

    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error || "Failed to update status");
      return;
    }

    const data = await res.json() as { beat?: IBeat };
    if (data.beat) {
      setStatus(data.beat.status);
      setPrivateToken(data.beat.privateToken);
    } else {
      setStatus(newStatus);
    }
    if (newStatus === "published") {
      setShowPublishSuccess(true);
    }
    if (newStatus === "unlisted" && data.beat?.privateToken) {
      const copied = await copyPrivateBeatLink(
        beat._id.toString(),
        data.beat.privateToken
      );
      toast.success(copied ? "Unlisted. Private link copied." : "Beat unlisted");
    } else {
      toast.success(
        newStatus === "published"
          ? "Beat published!"
          : newStatus === "draft"
            ? "Moved to drafts"
            : newStatus === "scheduled"
              ? "Beat scheduled"
              : "Beat archived"
      );
    }
    router.refresh();
  };

  const handleRotateToken = async () => {
    const res = await fetch(`/api/beats/${beat._id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rotateToken: true }),
    });
    if (!res.ok) {
      const err = await res.json();
      toast.error(err.error || "Failed to reset link");
      return;
    }
    const data = await res.json() as { beat?: IBeat };
    if (data.beat?.privateToken) {
      setPrivateToken(data.beat.privateToken);
      const copied = await copyPrivateBeatLink(
        beat._id.toString(),
        data.beat.privateToken
      );
      toast.success(copied ? "New private link copied" : "Private link reset");
    }
    router.refresh();
  };

  const handleDelete = async () => {
    if (!confirm(`Delete "${beat.title}"? This cannot be undone.`)) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/beats/${beat._id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json();
        toast.error(err.error || "Failed to delete");
        return;
      }
      toast.success("Beat deleted");
      router.push("/studio/beats");
    } catch {
      toast.error("Something went wrong");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Publish success card */}
      {showPublishSuccess && (
        <PublishSuccessCard
          beatId={beat._id.toString()}
          beatTitle={title || beat.title}
          producerName={beat.producerName}
          onDismiss={() => setShowPublishSuccess(false)}
        />
      )}

      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="icon">
            <Link href="/studio/beats">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Edit Beat</h1>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={status === "published" ? "default" : "secondary"}>
                {statusLabel(status)}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {beat.plays.toLocaleString()} plays &middot; {beat.salesCount ?? 0} sales
              </span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {status !== "published" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("published")}
            >
              <Eye className="mr-1.5 h-4 w-4" />
              Publish
            </Button>
          )}
          {isFeatureEnabled("privateDrops") && status !== "unlisted" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("unlisted")}
            >
              Unlist
            </Button>
          )}
          {status === "unlisted" && privateToken && (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const ok = await copyPrivateBeatLink(
                  beat._id.toString(),
                  privateToken
                );
                toast[ok ? "success" : "error"](
                  ok ? "Private link copied" : "Could not copy link"
                );
              }}
            >
              Copy link
            </Button>
          )}
          {status === "unlisted" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleRotateToken}
            >
              <RefreshCw className="mr-1.5 h-4 w-4" />
              Reset link
            </Button>
          )}
          {isFeatureEnabled("privateDrops") && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setScheduleOpen(true)}
          >
            Schedule
          </Button>
          )}
          {status === "published" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("draft")}
            >
              <EyeOff className="mr-1.5 h-4 w-4" />
              Unpublish
            </Button>
          )}
        </div>
      </div>

      {/* Artwork preview */}
      {beat.coverUrl && (
        <div className="relative h-40 w-40 overflow-hidden rounded-xl">
          <Image src={beat.coverUrl} alt={beat.title} fill className="object-cover" sizes="160px" />
        </div>
      )}

      {/* Metadata */}
      <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Music className="h-5 w-5 text-primary" />
            Beat Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Beat title"
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe your beat..."
              maxLength={1000}
              rows={3}
            />
            <p className="text-right text-xs text-muted-foreground">
              {description.length}/1000
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Genre</Label>
              <Select value={genre} onValueChange={(v) => v && setGenre(v)}>
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
              <Label htmlFor="bpm">BPM</Label>
              <Input
                id="bpm"
                type="number"
                value={bpm}
                onChange={(e) => setBpm(e.target.value)}
                min={40}
                max={300}
              />
            </div>

            <div className="space-y-2">
              <Label>Key</Label>
              <Select value={key} onValueChange={(v) => setKey(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select key" />
                </SelectTrigger>
                <SelectContent>
                  {KEY_OPTIONS.map((k) => (
                    <SelectItem key={k} value={k}>{k}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Mood</Label>
              <Select value={mood} onValueChange={(v) => setMood(v ?? "")}>
                <SelectTrigger>
                  <SelectValue placeholder="Select mood" />
                </SelectTrigger>
                <SelectContent>
                  {MOOD_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Tags (comma-separated)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. dark, melodic, piano"
            />
          </div>

          {isFeatureEnabled("freeDownloadLeads") && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 p-4">
            <div className="space-y-0.5">
              <Label htmlFor="free-download" className="text-sm font-medium">
                Offer free tagged download
              </Label>
              <p id="free-download-help" className="text-xs text-muted-foreground">
                Visitors can download the tagged MP3 in exchange for email or WhatsApp.
              </p>
            </div>
            <Switch
              id="free-download"
              checked={freeDownloadEnabled}
              onCheckedChange={(checked) => {
                if (typeof checked === "boolean") setFreeDownloadEnabled(checked);
              }}
              disabled={!canEnableFreeDownload(beat)}
              aria-describedby="free-download-help"
            />
          </div>
          )}
        </CardContent>
      </Card>

      {/* Files — interactive replace */}
      <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Files</CardTitle>
          <CardDescription>
            Replace any file by clicking the Replace button. The new file overwrites the existing one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            {(
              [
                { category: "preview" as const, label: "Preview MP3", hasFile: !!beat.audioTaggedUrl, accept: "audio/mpeg,audio/mp3,.mp3" },
                { category: "master" as const, label: "Master WAV", hasFile: !!beat.audioFullUrl, accept: "audio/wav,audio/x-wav,.wav" },
                { category: "stems" as const, label: "Stems ZIP", hasFile: !!beat.stemsUrl, accept: "application/zip,.zip" },
                { category: "artwork" as const, label: "Artwork", hasFile: !!beat.coverUrl, accept: "image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" },
              ] as const
            ).map(({ category, label, hasFile, accept }) => {
              const slot = fileReplace[category];
              const isUploading = slot?.status === "uploading";
              const isDone = slot?.status === "done";

              return (
                <div key={category}>
                  <div className="flex items-center justify-between rounded-md bg-background p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{label}</span>
                      {isDone ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                      ) : (
                        <Badge variant="outline">
                          {hasFile ? "Uploaded" : category === "stems" || category === "artwork" ? "Not provided" : "Missing"}
                        </Badge>
                      )}
                    </div>
                    <div>
                      <input
                        ref={(el) => { fileInputRefs.current[category] = el; }}
                        type="file"
                        accept={accept}
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) replaceFile(category, f);
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isUploading}
                        onClick={() => fileInputRefs.current[category]?.click()}
                      >
                        {isUploading ? (
                          <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                        )}
                        {hasFile || isDone ? "Replace" : "Upload"}
                      </Button>
                    </div>
                  </div>
                  {isUploading && (
                    <Progress value={slot.progress} className="mt-1 h-1.5" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {isFeatureEnabled("collabSplits") && (
        <CollaboratorsCard beatId={beat._id.toString()} />
      )}

      {/* Licenses */}
      <LicenseEditor licenses={licenses} beatId={beat._id.toString()} />

      <Separator />

      {/* Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-2">
          {status !== "archived" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("archived")}
            >
              <Archive className="mr-1.5 h-4 w-4" />
              Archive
            </Button>
          )}
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 h-4 w-4" />
            )}
            Delete Beat
          </Button>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </div>
      <SchedulePublishDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        initialValue={beat.publishAt}
        onConfirm={(local) =>
          handleStatusChange(
            status === "unlisted" ? "unlisted" : "scheduled",
            istDatetimeLocalToUtc(local)
          )
        }
      />
    </div>
  );
}
