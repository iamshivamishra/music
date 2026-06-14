import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import Song from "@/lib/models/Song";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await connectDB();

    const songs = await Song.find({ playlistId: id })
      .select("-audioUrl")
      .sort({ createdAt: -1 })
      .lean();

    return NextResponse.json({
      songs: JSON.parse(JSON.stringify(songs)),
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}