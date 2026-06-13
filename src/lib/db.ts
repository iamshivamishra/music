import mongoose from "mongoose";
 
const MONGODB_URI = process.env.MONGODB_URI!;
 
if (!MONGODB_URI) {
  throw new Error("MONGODB_URI .env.local mein set karo");
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
 
  cached.conn = await cached.promise;
  return cached.conn;
}
 