import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Playlist from "@/lib/models/Playlist";

// GET - saari playlists
export async function GET() {
  try {
    await connectDB();
    const playlists = await Playlist.find({}).sort({ createdAt: -1 }).lean();
    return NextResponse.json({
      playlists: JSON.parse(JSON.stringify(playlists)),
    });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST - naya playlist banao (sirf admin)
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
      return NextResponse.json({ error: "Sirf admin kar sakta hai" }, { status: 403 });
    }

    const formData = await req.formData();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const coverFile = formData.get("cover") as File | null;

    if (!name) {
      return NextResponse.json({ error: "Naam zaroori hai" }, { status: 400 });
    }

    let coverUrl = "";
    if (coverFile && coverFile.size > 0) {
      const { uploadImage } = await import("@/lib/cloudinary");
      const buffer = Buffer.from(await coverFile.arrayBuffer());
      const result = await uploadImage(buffer, coverFile.name);
      coverUrl = result.url;
    }

    await connectDB();
    const playlist = await Playlist.create({
      name,
      description,
      coverUrl,
      createdBy: user.userId,
    });

    return NextResponse.json(
      { message: "Playlist ban gayi!", playlist: JSON.parse(JSON.stringify(playlist)) },
      { status: 201 }
    );
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}