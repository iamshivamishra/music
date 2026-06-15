"use server";

import { connectDB } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import Purchase from "@/lib/models/Purchase";

export async function getUserPurchases() {
  const user = await getCurrentUser();
  if (!user) return [];

  await connectDB();
  const purchases = await Purchase.find({ userId: user.userId })
    .select("songId")
    .lean();

  return purchases.map((p) => p.songId.toString());
}

export async function checkSongPurchased(songId: string): Promise<boolean> {
  const user = await getCurrentUser();
  if (!user) return false;

  await connectDB();
  const purchase = await Purchase.findOne({ userId: user.userId, songId });
  return !!purchase;
}