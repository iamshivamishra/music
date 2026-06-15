import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { uploadAudio, uploadImage } from "@/lib/cloudinary";
import Song from "@/lib/models/Song";

// ✅ Ye 3 lines add karo - production ke liye zaroori
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json(
        { error: "Sirf admin upload kar sakta hai" },
        { status: 403 }
      );
    }

    // ✅ Content-Type check - malformed request pakadne ke liye
    const contentType = req.headers.get("content-type") || "";
    if (!contentType.includes("multipart/form-data")) {
      return NextResponse.json(
        { error: "multipart/form-data chahiye" },
        { status: 400 }
      );
    }

    const formData = await req.formData();
    const title = formData.get("title") as string;
    const artist = formData.get("artist") as string;
    const album = formData.get("album") as string;
    const genre = formData.get("genre") as string;
    const price = Number(formData.get("price")) || 49;
    const playlistId = formData.get("playlistId") as string;
    const audioFile = formData.get("audio") as File;
    const coverFile = formData.get("cover") as File | null;

    if (!title || !artist || !audioFile) {
      return NextResponse.json(
        { error: "Title, artist aur audio file zaroori hai" },
        { status: 400 }
      );
    }

    // ✅ File size check - 50MB limit
    const MAX_SIZE = 50 * 1024 * 1024;
    if (audioFile.size > MAX_SIZE) {
      return NextResponse.json(
        { error: "Audio file 50MB se badi nahi honi chahiye" },
        { status: 400 }
      );
    }

    // ✅ Cloudinary config check - silently fail hone se rokta hai
    if (
      !process.env.CLOUDINARY_CLOUD_NAME ||
      !process.env.CLOUDINARY_API_KEY ||
      !process.env.CLOUDINARY_API_SECRET
    ) {
      console.error("Cloudinary env variables missing!");
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      );
    }

    // Audio upload to Cloudinary
    const audioBuffer = Buffer.from(await audioFile.arrayBuffer());
    const audioResult = await uploadAudio(audioBuffer, audioFile.name);

    // Cover image upload (optional)
    let coverUrl = "";
    if (coverFile && coverFile.size > 0) {
      const coverBuffer = Buffer.from(await coverFile.arrayBuffer());
      const coverResult = await uploadImage(coverBuffer, coverFile.name);
      coverUrl = coverResult.url;
    }

    await connectDB();

    const song = await Song.create({
      title,
      artist,
      album,
      genre,
      price,
      audioUrl: audioResult.url,
      coverUrl,
      duration: Math.round(audioResult.duration),
      uploadedBy: user.userId,
      playlistId: playlistId || "",
    });

    return NextResponse.json(
      { message: "Song upload ho gaya!", song },
      { status: 201 }
    );
  } catch (err: unknown) {
    // ✅ Better error logging - production mein debug karne ke liye
    const error = err as Error;
    console.error("Upload error:", {
      message: error.message,
      stack: error.stack,
    });

    // ✅ Specific error messages
    if (error.message?.includes("cloudinary")) {
      return NextResponse.json(
        { error: "File upload failed - Cloudinary error" },
        { status: 500 }
      );
    }
    if (error.message?.includes("mongo")) {
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Upload mein problem aayi" },
      { status: 500 }
    );
  }
}