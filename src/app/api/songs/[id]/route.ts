import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Song from "@/lib/models/Song";
import Purchase from '@/lib/models/Purchase';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();

    const song = await Song.findById(id);
    if (!song) {
      return NextResponse.json({ error: "Song nahi mila" }, { status: 404 });
    }

    const user = await getCurrentUser();
    let hasPurchased = false;

    if (user) {
      const purchase = await Purchase.findOne({
        userId: user.userId,
        songId: id,
      });
      hasPurchased = !!purchase;
    }

    // Sabko audio URL milega — 10 sec limit AudioPlayer (frontend) mein lagi hai
    const audioUrl = song.audioUrl;

    return NextResponse.json({
      song: {
        _id: song._id,
        title: song.title,
        artist: song.artist,
        album: song.album,
        genre: song.genre,
        duration: song.duration,
        price: song.price,
        coverUrl: song.coverUrl,
        createdAt: song.createdAt,
      },
      audioUrl,
      hasPurchased,
    });
  } catch (err) {
    console.error("Song fetch error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}