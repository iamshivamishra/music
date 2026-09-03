import type { BeatFileCategory } from "@/lib/storage/keys";

export const MULTIPART_THRESHOLD = 50 * 1024 * 1024; // 50 MB
export const MULTIPART_PART_SIZE = 10 * 1024 * 1024; // 10 MB
export const MULTIPART_CONCURRENCY = 3;

export interface PresignedUploadPayload {
  uploadUrl: string;
  publicUrl: string;
  key: string;
}

export interface MultipartInitPayload {
  uploadId: string;
  key: string;
  publicUrl: string;
  partUrls: string[];
}

export interface UploadResult {
  url: string;
  key: string;
}

type ProgressCallback = (pct: number) => void;

async function fetchJson<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const payload = await res.json().catch(() => null);
    throw new Error(payload?.error || `Request to ${url} failed`);
  }

  return res.json() as Promise<T>;
}

function xhrPut(
  url: string,
  data: Blob,
  contentType: string,
  onProgress?: ProgressCallback,
  abortSignal?: AbortSignal
): Promise<{ status: number; getHeader: (name: string) => string | null }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    if (onProgress) {
      xhr.upload.addEventListener("progress", (event) => {
        if (event.lengthComputable) {
          onProgress(Math.round((event.loaded / event.total) * 100));
        }
      });
    }

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({
          status: xhr.status,
          getHeader: (name: string) => xhr.getResponseHeader(name),
        });
        return;
      }
      reject(new Error(`Upload failed (${xhr.status})`));
    });

    xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

    if (abortSignal) {
      abortSignal.addEventListener("abort", () => xhr.abort());
    }

    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.send(data);
  });
}

export async function uploadSinglePut(
  file: File,
  category: BeatFileCategory,
  beatId: string,
  onProgress?: ProgressCallback,
  options?: { replace?: boolean; abortSignal?: AbortSignal }
): Promise<UploadResult> {
  const target = await fetchJson<PresignedUploadPayload>("/api/upload/presign", {
    beatId,
    category,
    contentType: file.type,
    fileSize: file.size,
    ...(options?.replace ? { replace: true } : {}),
  });

  await xhrPut(target.uploadUrl, file, file.type, onProgress, options?.abortSignal);

  return { url: target.publicUrl, key: target.key };
}

export async function uploadMultipart(
  file: File,
  category: BeatFileCategory,
  beatId: string,
  onProgress?: ProgressCallback,
  abortSignal?: AbortSignal
): Promise<UploadResult> {
  const { uploadId, key, publicUrl, partUrls } =
    await fetchJson<MultipartInitPayload>("/api/upload/multipart", {
      beatId,
      category,
      contentType: file.type,
      fileSize: file.size,
    });

  const partCount = partUrls.length;
  const partProgress = new Array<number>(partCount).fill(0);

  const updateTotalProgress = () => {
    if (!onProgress) return;
    const loaded = partProgress.reduce((a, b) => a + b, 0);
    onProgress(Math.min(Math.round((loaded / file.size) * 100), 99));
  };

  const uploadPart = async (
    partIndex: number
  ): Promise<{ PartNumber: number; ETag: string }> => {
    const start = partIndex * MULTIPART_PART_SIZE;
    const end = Math.min(start + MULTIPART_PART_SIZE, file.size);
    const blob = file.slice(start, end);

    const result = await xhrPut(
      partUrls[partIndex],
      blob,
      file.type,
      (pct) => {
        partProgress[partIndex] = (pct / 100) * (end - start);
        updateTotalProgress();
      },
      abortSignal
    );

    const etag = result.getHeader("ETag");
    if (!etag) throw new Error(`Part ${partIndex + 1}: missing ETag`);
    return { PartNumber: partIndex + 1, ETag: etag };
  };

  try {
    const completedParts: Array<{ PartNumber: number; ETag: string }> = [];
    for (let i = 0; i < partCount; i += MULTIPART_CONCURRENCY) {
      const batch = Array.from(
        { length: Math.min(MULTIPART_CONCURRENCY, partCount - i) },
        (_, j) => uploadPart(i + j)
      );
      const results = await Promise.all(batch);
      completedParts.push(...results);
    }

    await fetchJson("/api/upload/multipart/complete", {
      key,
      uploadId,
      parts: completedParts,
    });

    return { url: publicUrl, key };
  } catch (err) {
    await fetch("/api/upload/multipart/abort", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key, uploadId }),
    }).catch(() => {});
    throw err;
  }
}

export async function uploadFile(
  file: File,
  category: BeatFileCategory,
  beatId: string,
  onProgress?: ProgressCallback,
  options?: { replace?: boolean; abortSignal?: AbortSignal }
): Promise<UploadResult> {
  if (file.size > MULTIPART_THRESHOLD) {
    return uploadMultipart(file, category, beatId, onProgress, options?.abortSignal);
  }
  return uploadSinglePut(file, category, beatId, onProgress, options);
}
