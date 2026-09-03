#!/usr/bin/env node

/**
 * One-time backfill: set producerId on existing Purchase documents
 * by looking up the associated Beat or BeatPack.
 *
 * Usage: node scripts/backfill-purchase-producer-ids.mjs
 *
 * Requires MONGODB_URI in .env (or as an environment variable).
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
console.log("Connected to MongoDB");

const purchases = db.collection("purchases");
const beats = db.collection("beats");
const beatpacks = db.collection("beatpacks");

const cursor = purchases.find({ producerId: { $exists: false } });
let updated = 0;
let skipped = 0;
let total = 0;

for await (const purchase of cursor) {
  total++;

  let producerId = null;

  if (purchase.beatId) {
    const beat = await beats.findOne(
      { _id: purchase.beatId },
      { projection: { producerId: 1 } }
    );
    if (beat) producerId = beat.producerId;
  }

  if (!producerId && purchase.packId) {
    const pack = await beatpacks.findOne(
      { _id: purchase.packId },
      { projection: { producerId: 1 } }
    );
    if (pack) producerId = pack.producerId;
  }

  if (producerId) {
    await purchases.updateOne(
      { _id: purchase._id },
      { $set: { producerId } }
    );
    updated++;
  } else {
    skipped++;
    console.warn(`  Skipped purchase ${purchase._id} — no beat or pack found`);
  }

  if (total % 100 === 0) {
    console.log(`  Processed ${total} (updated: ${updated}, skipped: ${skipped})`);
  }
}

console.log(`\nDone. Total: ${total}, Updated: ${updated}, Skipped: ${skipped}`);
await mongoose.disconnect();
