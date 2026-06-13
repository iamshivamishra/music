import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createOrder } from "@/lib/razorpay";
import { connectDB } from "@/lib/db";
import Song from '@/lib/models/Song';
import Purchase from "@/lib/models/Purchase";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Pehle login karo" }, { status: 401 });
    }

    const { songId } = await req.json();
    if (!songId) {
      return NextResponse.json({ error: "Song ID chahiye" }, { status: 400 });
    }

    await connectDB();

    // Already purchased check
    const existing = await Purchase.findOne({ userId: user.userId, songId });
    if (existing) {
      return NextResponse.json(
        { error: "Ye song already khareed chuke ho" },
        { status: 409 }
      );
    }

    const song = await Song.findById(songId);
    if (!song) {
      return NextResponse.json({ error: "Song nahi mila" }, { status: 404 });
    }

    const order = await createOrder(song.price, songId);

    return NextResponse.json({
      orderId: order.id,
      amount: song.price,
      currency: "INR",
      songTitle: song.title,
    });
  } catch (err) {
    console.error("Create order error:", err);
    return NextResponse.json({ error: "Order create nahi hua" }, { status: 500 });
  }
}