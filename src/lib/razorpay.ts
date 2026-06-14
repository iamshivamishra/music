export const razorpayClient = null;

import Razorpay from "razorpay";
import crypto from "crypto";

export const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID!,
  key_secret: process.env.RAZORPAY_KEY_SECRET!,
});

export async function createOrder(amount: number, songId: string) {
  const order = await razorpay.orders.create({
    amount: amount * 100, // paise mein (INR × 100)
    currency: "INR",
    receipt: `rcpt_${Date.now()}`,
    notes: { songId },
  });
  return order;
}

export function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string
): boolean {
  const body = `${orderId}|${paymentId}`;
  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET!)
    .update(body)
    .digest("hex");
  return expectedSignature === signature;
}