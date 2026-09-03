"use client";

import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MULTIPART_PART_SIZE, type MultipartInitPayload } from "@/lib/upload-client";

interface Props {
  jobId: string;
  busy: boolean;
  uploading: boolean;
  onBusy: (fn: () => Promise<void>) => Promise<void>;
  onComplete: () => void;
}

export function JobDeliveryUpload({ jobId, busy, uploading, onBusy, onComplete }: Props) {
  const uploadZip = async (file: File) => {
    await onBusy(async () => {
      const initRes = await fetch(`/api/service-jobs/${jobId}/delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contentType: file.type || "application/zip",
          fileSize: file.size,
        }),
      });
      const init = (await initRes.json()) as MultipartInitPayload & { error?: string };
      if (!initRes.ok) throw new Error(init.error || "Could not start upload");

      const parts: Array<{ PartNumber: number; ETag: string }> = [];
      for (let i = 0; i < init.partUrls.length; i++) {
        const start = i * MULTIPART_PART_SIZE;
        const blob = file.slice(start, Math.min(start + MULTIPART_PART_SIZE, file.size));
        const put = await fetch(init.partUrls[i], {
          method: "PUT",
          body: blob,
          headers: { "Content-Type": file.type || "application/zip" },
        });
        if (!put.ok) throw new Error(`Upload part ${i + 1} failed`);
        const etag = put.headers.get("ETag");
        if (!etag) throw new Error("Missing ETag from upload");
        parts.push({ PartNumber: i + 1, ETag: etag });
      }

      const completeRes = await fetch("/api/upload/multipart/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: init.key, uploadId: init.uploadId, parts }),
      });
      if (!completeRes.ok) throw new Error("Could not finalize upload");

      const saveRes = await fetch(`/api/service-jobs/${jobId}/delivery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: init.key }),
      });
      if (!saveRes.ok) throw new Error((await saveRes.json()).error || "Could not save delivery");
      toast.success("Delivery uploaded");
      onComplete();
    });
  };

  return (
    <label className="inline-flex">
      <input
        type="file"
        accept=".zip,application/zip"
        className="sr-only"
        disabled={busy}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadZip(file);
          event.target.value = "";
        }}
      />
      <Button asChild disabled={busy}>
        <span>
          {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
          Upload ZIP
        </span>
      </Button>
    </label>
  );
}
