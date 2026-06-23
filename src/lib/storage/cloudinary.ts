import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import { logger } from "@/lib/logger";

let _configured = false;

function ensureConfigured() {
  if (_configured) return;

  const url = process.env.CLOUDINARY_URL;
  if (!url) throw new Error("CLOUDINARY_URL not set");

  cloudinary.config({ secure: true });
  _configured = true;
}

export async function uploadToCloudinary(
  buffer: Buffer,
  key: string,
  resourceType: "image" | "video" | "raw" = "raw"
): Promise<string> {
  ensureConfigured();

  return new Promise<string>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        public_id: key.replace(/\.[^.]+$/, ""),
        resource_type: resourceType,
        folder: "",
        overwrite: true,
      },
      (error, result?: UploadApiResponse) => {
        if (error) {
          logger.error("Cloudinary upload failed", { key, error: error.message });
          return reject(error);
        }
        resolve(result!.secure_url);
      }
    );

    stream.end(buffer);
  });
}

export async function deleteFromCloudinary(
  key: string,
  resourceType: "image" | "video" | "raw" = "raw"
): Promise<void> {
  ensureConfigured();
  const publicId = key.replace(/\.[^.]+$/, "");
  await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  logger.info("Deleted from Cloudinary", { key });
}

export function getCloudinaryUrl(key: string): string {
  ensureConfigured();
  return cloudinary.url(key.replace(/\.[^.]+$/, ""), { secure: true });
}
