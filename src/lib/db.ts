import mongoose from "mongoose";
import { logger } from "@/lib/logger";
 
const MONGODB_URI = process.env.MONGODB_URI!;
 
if (!MONGODB_URI) {
  throw new Error("MONGODB_URI must be set in the environment");
}
 
// Global cache taaki har request pe naya connection na bane
declare global {
  // eslint-disable-next-line no-var
  var mongoose: { conn: mongoose.Connection | null; promise: Promise<mongoose.Connection> | null };
}
 
let cached = global.mongoose;
 
if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}
 
export async function connectDB() {
  if (cached.conn) return cached.conn;
 
  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, { bufferCommands: false })
      .then((m) => m.connection);
  }
 
  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (error) {
    cached.promise = null;
    cached.conn = null;
    const message =
      error instanceof Error ? error.message : "Could not connect to the database.";
    logger.error("MongoDB connection failed", { error: message });
    // Re-throw a plain Error so App Router can serialize it to error.tsx.
    throw new Error(message);
  }
}

export async function withTransaction<T>(
  operation: (session: mongoose.ClientSession) => Promise<T>
): Promise<T> {
  await connectDB();
  const session = await mongoose.startSession();

  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await operation(session);
    });
    return result as T;
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const unsupportedTransactions =
      message.includes("Transaction numbers are only allowed") ||
      message.includes("replica set");

    if (unsupportedTransactions) {
      const allowFallback = process.env.ALLOW_NON_TRANSACTIONAL_FALLBACK === "true";
      const isProd = process.env.NODE_ENV === "production";

      if (isProd && allowFallback) {
        logger.warn("ALLOW_NON_TRANSACTIONAL_FALLBACK is enabled in production — data integrity at risk");
      }

      if (isProd && !allowFallback) {
        throw new Error(
          "MongoDB transactions are not supported by this deployment. Use a replica set or set ALLOW_NON_TRANSACTIONAL_FALLBACK=true explicitly."
        );
      }
      const fallbackSession = await mongoose.startSession();
      logger.warn("Running operation without transaction — MongoDB does not support transactions in this deployment", {
        allowFallback,
        nodeEnv: process.env.NODE_ENV,
      });
      try {
        return await operation(fallbackSession);
      } finally {
        await fallbackSession.endSession();
      }
    }

    throw error;
  } finally {
    await session.endSession();
  }
}
 