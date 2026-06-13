"use server";

import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Song from "@/lib/models/Song";

export async function getAllSongs() {
  await connectDB();

  const songs = await Song.find({})
    .select("-audioUrl")
    .sort({ createdAt: -1 })
    .lean();

  return JSON.parse(JSON.stringify(songs));
}

export async function getSongById(id: string) {
  await connectDB();

  const song = await Song.findById(id).lean();

  return JSON.parse(JSON.stringify(song));
}

export async function deleteSong(songId: string) {
  const user = await getCurrentUser();

  if (!user || user.role !== "admin") {
    throw new Error("Sirf admin delete kar sakta hai");
  }

  await connectDB();

  await Song.findByIdAndDelete(songId);

  return { success: true };
}