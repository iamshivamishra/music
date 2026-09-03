#!/usr/bin/env node

/**
 * One-time backfill: set publishedAt = createdAt on published beats
 * that do not yet have publishedAt.
 *
 * Usage: node scripts/backfill-published-at.mjs
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
const beats = mongoose.connection.db.collection("beats");
console.log("Connected to MongoDB");

const result = await beats.updateMany(
  {
    isPublished: true,
    $or: [{ publishedAt: { $exists: false } }, { publishedAt: null }],
  },
  [{ $set: { publishedAt: "$createdAt" } }]
);

console.log(`Updated ${result.modifiedCount} published beats with publishedAt`);
await mongoose.disconnect();
