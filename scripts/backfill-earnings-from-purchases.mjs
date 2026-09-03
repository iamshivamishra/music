#!/usr/bin/env node

/**
 * One-time backfill: create one Earning per historical Purchase
 * (full amount to Purchase.producerId). Required before switching
 * withdrawable balance to the earnings ledger.
 *
 * Usage: node scripts/backfill-earnings-from-purchases.mjs
 *
 * Requires MONGODB_URI in .env.
 */

import "dotenv/config";
import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is required");
  process.exit(1);
}

await mongoose.connect(MONGODB_URI);
const db = mongoose.connection.db;
if (!db) {
  console.error("No database connection");
  process.exit(1);
}
console.log("Connected to MongoDB");

const purchases = db.collection("purchases");
const earnings = db.collection("earnings");
const orders = db.collection("orders");

await earnings.createIndex({ purchaseId: 1, producerId: 1 }, { unique: true });
await earnings.createIndex({ producerId: 1, createdAt: -1 });
await earnings.createIndex({ beatId: 1 });

const cursor = purchases.find({});
let inserted = 0;
let skipped = 0;
let missingProducer = 0;
let total = 0;

for await (const purchase of cursor) {
  total += 1;
  if (!purchase.producerId) {
    missingProducer += 1;
    console.warn(`  Missing producerId on purchase ${purchase._id}`);
    continue;
  }

  const existing = await earnings.findOne({
    purchaseId: purchase._id,
    producerId: purchase.producerId,
  });
  if (existing) {
    skipped += 1;
    continue;
  }

  let orderMongoId = null;
  if (purchase.orderId) {
    const order = await orders.findOne(
      { razorpayOrderId: purchase.orderId },
      { projection: { _id: 1 } }
    );
    orderMongoId = order?._id ?? null;
  }

  await earnings.insertOne({
    purchaseId: purchase._id,
    orderId: orderMongoId ?? purchase._id,
    beatId: purchase.beatId,
    packId: purchase.packId,
    producerId: purchase.producerId,
    grossAmount: purchase.amount,
    sharePercent: 100,
    createdAt: purchase.createdAt ?? new Date(),
    updatedAt: new Date(),
  });
  inserted += 1;

  if (total % 100 === 0) {
    console.log(`  Processed ${total} (inserted: ${inserted}, skipped: ${skipped}, missing producer: ${missingProducer})`);
  }
}

if (missingProducer > 0) {
  console.error(`\nFailed: ${missingProducer} purchases missing producerId. Run scripts/backfill-purchase-producer-ids.mjs first.`);
  await mongoose.disconnect();
  process.exit(1);
}

console.log(`\nDone. Total: ${total}, Inserted: ${inserted}, Skipped: ${skipped}`);
await mongoose.disconnect();
