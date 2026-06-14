import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Song from "@/lib/models/Song";
import Purchase from "@/lib/models/Purchase";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await getCurrentUser();

    if (!user) {
      return NextResponse.json({ error: "Login required" }, { status: 401 });
    }

    await connectDB();

    // Check purchase
    const purchase = await Purchase.findOne({ userId: user.userId, songId: id });
    if (!purchase) {
      return NextResponse.json({ error: "Song not purchased" }, { status: 403 });
    }

    const song = await Song.findById(id);
    if (!song) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    // Fetch audio file from Cloudinary
    const audioRes = await fetch(song.audioUrl);
    const audioBuffer = await audioRes.arrayBuffer();

    const fileName = `${song.title} - ${song.artist}.mp3`.replace(/[^a-zA-Z0-9.\- ]/g, "");

    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Disposition": `attachment; filename="${fileName}"`,
      },
    });
  } catch (err) {
    console.error("Download error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}