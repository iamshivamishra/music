import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function uploadAudio(
  fileBuffer: Buffer,
  fileName: string
): Promise<{ url: string; publicId: string; duration: number }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "video", // audio ke liye bhi "video" use hota hai Cloudinary mein
        folder: "music-app/songs",
        public_id: fileName.replace(/\.[^/.]+$/, ""), // extension hata do
        format: "mp3",
      },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          duration: result.duration || 0,
        });
      }
    );
    uploadStream.end(fileBuffer);
  });
}

export async function uploadImage(
  fileBuffer: Buffer,
  fileName: string
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        resource_type: "image",
        folder: "music-app/covers",
        public_id: fileName.replace(/\.[^/.]+$/, ""),
        transformation: [{ width: 400, height: 400, crop: "fill" }],
      },
      (error, result) => {
        if (error || !result) return reject(error);
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    uploadStream.end(fileBuffer);
  });
}

export async function deleteFile(publicId: string, resourceType: "video" | "image" = "video") {
  return cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
}