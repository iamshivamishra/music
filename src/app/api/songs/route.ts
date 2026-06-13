import { NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Song from "@/lib/models/Song";

export async function GET() {
  try {
    await connectDB();
    // Audio URL mat bhejo listing mein - security ke liye
    const songs = await Song.find({})
      .select("-audioUrl")
      .sort({ createdAt: -1 });

    return NextResponse.json({ songs });
  } catch (err) {
    console.error("Songs fetch error:", err);
    return NextResponse.json({ error: "Songs nahi mile" }, { status: 500 });
  }
}