import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { uploadAudio, uploadImage } from "@/lib/cloudinary";
import Song from "@/lib/models/Song";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Sirf admin upload kar sakta hai" }, { status: 403 });
    }

    const formData = await req.formData();
    const title = formData.get("title") as string;
    const artist = formData.get("artist") as string;
    const album = formData.get("album") as string;
    const genre = formData.get("genre") as string;
    const price = Number(formData.get("price")) || 49;
    const audioFile = formData.get("audio") as File;
    const coverFile = formData.get("cover") as File | null;

    if (!title || !artist || !audioFile) {
      return NextResponse.json(
        { error: "Title, artist aur audio file zaroori hai" },
        { status: 400 }
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
    });

    return NextResponse.json(
      { message: "Song upload ho gaya!", song },
      { status: 201 }
    );
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}