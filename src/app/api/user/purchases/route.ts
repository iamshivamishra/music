import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import Purchase from "@/lib/models/Purchase";

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ purchasedSongIds: [] });
    }

    await connectDB();

    const purchases = await Purchase.find({ userId: user.userId }).select("songId");
    const purchasedSongIds = purchases.map((p) => p.songId.toString());

    return NextResponse.json({ purchasedSongIds });
  } catch (err) {
    console.error("Purchases fetch error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}