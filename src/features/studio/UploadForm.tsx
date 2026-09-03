"use client";

import { useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Loader2, Upload, Music, Image as ImageIcon,
  FileArchive, HardDrive, Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { GENRE_OPTIONS, KEY_OPTIONS, MOOD_OPTIONS } from "@/lib/validators/beat";
import { FILE_LIMITS } from "@/lib/storage/limits";
import { uploadFile } from "@/lib/upload-client";
import type { BeatFileCategory } from "@/lib/storage/keys";
import { FileUploadSlot, formatSize, type FileSlot } from "@/components/upload/FileUploadSlot";
import { PricingSection } from "@/components/upload/PricingSection";
import { SchedulePublishDialog } from "@/features/studio/SchedulePublishDialog";
import { copyPrivateBeatLink } from "@/lib/beats/private-link";
import { istDatetimeLocalToUtc } from "@/lib/datetime/ist";
import { isFeatureEnabled } from "@/lib/feature-flags";
import type { BeatStatus } from "@/types";

export default function UploadForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [genre, setGenre] = useState("");
  const [bpm, setBpm] = useState("");
  const [key, setKey] = useState("");
  const [mood, setMood] = useState("");
  const [tags, setTags] = useState("");
  const [freeDownloadEnabled, setFreeDownloadEnabled] = useState(false);

  const [priceBasic, setPriceBasic] = useState("");
  const [pricePremium, setPricePremium] = useState("");
  const [priceUnlimited, setPriceUnlimited] = useState("");
  const [priceExclusive, setPriceExclusive] = useState("");

  const [preview, setPreview] = useState<FileSlot>({ file: null, progress: 0, status: "idle" });
  const [master, setMaster] = useState<FileSlot>({ file: null, progress: 0, status: "idle" });
  const [stems, setStems] = useState<FileSlot>({ file: null, progress: 0, status: "idle" });
  const [artwork, setArtwork] = useState<FileSlot>({ file: null, progress: 0, status: "idle" });

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const validateAndSet = useCallback(
    (file: File, category: BeatFileCategory, setSlot: React.Dispatch<React.SetStateAction<FileSlot>>) => {
      const max = FILE_LIMITS[category].maxSize;
      if (file.size > max) {
        toast.error(`${file.name} exceeds the ${formatSize(max)} limit`);
        return;
      }
      setSlot({ file, progress: 0, status: "idle" });
    },
    []
  );

  const doUploadFile = useCallback(
    async (
      file: File,
      category: BeatFileCategory,
      beatId: string,
      setSlot: React.Dispatch<React.SetStateAction<FileSlot>>
    ) => {
      setSlot((s) => ({ ...s, progress: 0, status: "uploading" }));
      const result = await uploadFile(
        file,
        category,
        beatId,
        (pct) => setSlot((s) => ({ ...s, progress: pct })),
        { abortSignal: abortControllerRef.current?.signal }
      );
      setSlot((s) => ({ ...s, progress: 100, status: "done" }));
      return result;
    },
    []
  );

  const handleAbort = useCallback(async () => {
    abortControllerRef.current?.abort();
    setLoading(false);
    setPreview((s) => ({ ...s, status: s.status === "done" ? "done" : "idle", progress: 0 }));
    setMaster((s) => ({ ...s, status: s.status === "done" ? "done" : "idle", progress: 0 }));
    setStems((s) => ({ ...s, status: s.status === "done" ? "done" : "idle", progress: 0 }));
    setArtwork((s) => ({ ...s, status: s.status === "done" ? "done" : "idle", progress: 0 }));
    toast.info("Upload cancelled");
  }, []);

  const doUpload = async (
    publishStatus: Extract<BeatStatus, "draft" | "unlisted" | "scheduled" | "published">,
    publishAt?: Date
  ) => {
    if (!preview.file || !master.file) {
      toast.error("Preview MP3 and Master WAV are required");
      return;
    }

    setLoading(true);
    abortControllerRef.current = new AbortController();

    try {
      const beatId = crypto.randomUUID();
      const [previewAsset, masterAsset, stemsAsset, artworkAsset] = await Promise.all([
        doUploadFile(preview.file, "preview", beatId, setPreview),
        doUploadFile(master.file, "master", beatId, setMaster),
        stems.file
          ? doUploadFile(stems.file, "stems", beatId, setStems)
          : Promise.resolve(undefined),
        artwork.file
          ? doUploadFile(artwork.file, "artwork", beatId, setArtwork)
          : Promise.resolve(undefined),
      ]);

      const payload = {
        title,
        description: description || undefined,
        genre,
        bpm: bpm ? Number(bpm) : undefined,
        key: key || undefined,
        mood: mood || undefined,
        tags: tags
          ? tags.split(",").map((tag) => tag.trim()).filter(Boolean)
          : [],
        status: publishStatus,
        publishAt: publishAt?.toISOString(),
        freeDownloadEnabled: isFeatureEnabled("freeDownloadLeads")
          ? freeDownloadEnabled
          : false,
        licenses:
          priceBasic || pricePremium || priceUnlimited || priceExclusive
            ? {
                basic: priceBasic ? { price: Number(priceBasic) } : undefined,
                premium: pricePremium ? { price: Number(pricePremium) } : undefined,
                unlimited: priceUnlimited ? { price: Number(priceUnlimited) } : undefined,
                exclusive: priceExclusive ? { price: Number(priceExclusive) } : undefined,
              }
            : undefined,
        uploadedAssets: {
          preview: previewAsset,
          master: masterAsset,
          stems: stemsAsset,
          artwork: artworkAsset,
        },
      };

      const createRes = await fetch("/api/beats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!createRes.ok) {
        const errorPayload = await createRes.json().catch(() => null);
        throw new Error(errorPayload?.error || "Failed to create beat");
      }

      const created = await createRes.json() as { beat?: { _id: string; privateToken?: string } };
      if (publishStatus === "unlisted" && created.beat?.privateToken) {
        const copied = await copyPrivateBeatLink(
          created.beat._id,
          created.beat.privateToken
        );
        toast.success(
          copied
            ? "Unlisted beat saved. Private link copied."
            : "Unlisted beat saved."
        );
      } else {
        toast.success(
          publishStatus === "published"
            ? "Beat published!"
            : publishStatus === "scheduled"
              ? "Beat scheduled"
              : "Beat saved as draft"
        );
      }
      router.push("/studio/beats");
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong";
      toast.error(message);
      setPreview((s) => ({ ...s, status: "error" }));
      setMaster((s) => ({ ...s, status: "error" }));
      setStems((s) => ({ ...s, status: "error" }));
      setArtwork((s) => ({ ...s, status: "error" }));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    doUpload("published");
  };

  return (
    <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="h-5 w-5 text-primary" />
          Upload Beat
        </CardTitle>
        <CardDescription>
          Upload your beat files. Preview MP3 and Master WAV are required.
          Stems and artwork are optional. Set your own license prices below —
          leave blank to use default pricing.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6">
          {/* Metadata */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Beat title"
                required
                minLength={2}
              />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your beat..."
                maxLength={1000}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="genre">Genre *</Label>
              <Select value={genre} onValueChange={(v) => v && setGenre(v)} required>
                <SelectTrigger id="genre">
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
                placeholder="e.g. 140"
                min={40}
                max={300}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="key">Key</Label>
              <Select value={key} onValueChange={(v) => setKey(v ?? "")}>
                <SelectTrigger id="key">
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
              <Label htmlFor="mood">Mood</Label>
              <Select value={mood} onValueChange={(v) => setMood(v ?? "")}>
                <SelectTrigger id="mood">
                  <SelectValue placeholder="Select mood" />
                </SelectTrigger>
                <SelectContent>
                  {MOOD_OPTIONS.map((m) => (
                    <SelectItem key={m} value={m}>{m}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="tags">Tags (comma-separated)</Label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. dark, melodic, piano"
              />
            </div>
          </div>

          {/* License Pricing */}
          <PricingSection
            priceBasic={priceBasic}
            setPriceBasic={setPriceBasic}
            pricePremium={pricePremium}
            setPricePremium={setPricePremium}
            priceUnlimited={priceUnlimited}
            setPriceUnlimited={setPriceUnlimited}
            priceExclusive={priceExclusive}
            setPriceExclusive={setPriceExclusive}
          />

          {isFeatureEnabled("freeDownloadLeads") && (
          <div className="flex items-center justify-between gap-4 rounded-xl border border-border/50 p-4">
            <div className="space-y-0.5">
              <Label htmlFor="free-download" className="text-sm font-medium">
                Offer free tagged download
              </Label>
              <p id="free-download-help" className="text-xs text-muted-foreground">
                Visitors can download the tagged MP3 in exchange for email or WhatsApp.
                Requires a preview file.
              </p>
            </div>
            <Switch
              id="free-download"
              checked={freeDownloadEnabled}
              onCheckedChange={(checked) => {
                if (typeof checked === "boolean") setFreeDownloadEnabled(checked);
              }}
              disabled={!preview.file}
              aria-describedby="free-download-help"
            />
          </div>
          )}

          {/* File uploads */}
          <div className="space-y-1">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <HardDrive className="h-4 w-4 text-primary" />
              Files
            </h3>
            <p className="text-xs text-muted-foreground">
              Supported: MP3 (preview), WAV (master), ZIP (stems), JPEG/PNG/WebP (artwork)
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FileUploadSlot
              label="Preview MP3"
              accept="audio/mpeg,audio/mp3,.mp3"
              slot={preview}
              onSelect={(f) => validateAndSet(f, "preview", setPreview)}
              onClear={() => {
                setPreview({ file: null, progress: 0, status: "idle" });
                setFreeDownloadEnabled(false);
              }}
              icon={<Music className="h-8 w-8" />}
              required
              hint="Max 20 MB — tagged preview"
            />
            <FileUploadSlot
              label="Master WAV"
              accept="audio/wav,audio/x-wav,.wav"
              slot={master}
              onSelect={(f) => validateAndSet(f, "master", setMaster)}
              onClear={() => setMaster({ file: null, progress: 0, status: "idle" })}
              icon={<Music className="h-8 w-8" />}
              required
              hint="Max 100 MB — untagged master"
            />
            <FileUploadSlot
              label="Stems ZIP"
              accept="application/zip,.zip"
              slot={stems}
              onSelect={(f) => validateAndSet(f, "stems", setStems)}
              onClear={() => setStems({ file: null, progress: 0, status: "idle" })}
              icon={<FileArchive className="h-8 w-8" />}
              hint="Max 500 MB — optional"
            />
            <FileUploadSlot
              label="Artwork"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              slot={artwork}
              onSelect={(f) => validateAndSet(f, "artwork", setArtwork)}
              onClear={() => setArtwork({ file: null, progress: 0, status: "idle" })}
              icon={<ImageIcon className="h-8 w-8" />}
              hint="Max 5 MB — optional"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {loading ? (
              <Button
                type="button"
                variant="destructive"
                className="sm:col-span-2"
                size="lg"
                onClick={handleAbort}
              >
                <Ban className="mr-2 h-4 w-4" />
                Cancel Upload
              </Button>
            ) : (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  size="lg"
                  onClick={() => doUpload("draft")}
                >
                  Save draft
                </Button>
                {isFeatureEnabled("privateDrops") && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  size="lg"
                  onClick={() => doUpload("unlisted")}
                >
                  Unlisted link
                </Button>
                )}
                {isFeatureEnabled("privateDrops") && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={loading}
                  size="lg"
                  onClick={() => setScheduleOpen(true)}
                >
                  Schedule
                </Button>
                )}
                <Button type="submit" disabled={loading} size="lg">
                  <Upload className="mr-2 h-4 w-4" />
                  Publish
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </form>
      <SchedulePublishDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        onConfirm={(local) => doUpload("scheduled", istDatetimeLocalToUtc(local))}
      />
    </Card>
  );
}
