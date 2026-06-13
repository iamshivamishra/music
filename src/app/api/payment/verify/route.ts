import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifySignature } from "@/lib/razorpay";
import { connectDB } from "@/lib/db";
import Song from "@/lib/models/Song";
import Purchase from "@/lib/models/Purchase";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, songId } =
      await req.json();

    // Signature verify karo
    const isValid = verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return NextResponse.json(
        { error: "Payment verify nahi hua - invalid signature" },
        { status: 400 }
      );
    }

    await connectDB();

    const song = await Song.findById(songId);
    if (!song) {
      return NextResponse.json({ error: "Song nahi mila" }, { status: 404 });
    }

    // Purchase record save karo
    await Purchase.create({
      userId: user.userId,
      songId,
      orderId: razorpay_order_id,
      paymentId: razorpay_payment_id,
      amount: song.price,
    });

    return NextResponse.json({
      message: "Payment successful! Song unlock ho gaya 🎵",
      songId,
    });
  } catch (err) {
    console.error("Payment verify error:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}