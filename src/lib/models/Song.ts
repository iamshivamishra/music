import mongoose, { Schema, Model } from "mongoose";
import { ISong } from "@/types";

const SongSchema = new Schema<ISong>(
  {
    title: { type: String, required: true, trim: true },
    artist: { type: String, required: true, trim: true },
    album: { type: String, trim: true },
    genre: { type: String, trim: true },
    duration: { type: Number, default: 0 },
    price: { type: Number, required: true, default: 49 },
    audioUrl: { type: String, required: true },
    coverUrl: { type: String, default: "" },
    uploadedBy: { type: String, required: true },
    playlistId: { type: String, default: "" }, // 👈 naya field
  },
  { timestamps: true }
);

const Song: Model<ISong> =
  mongoose.models.Song || mongoose.model<ISong>("Song", SongSchema);

export default Song;