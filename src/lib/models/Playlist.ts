import mongoose, { Schema, Model } from "mongoose";

export interface IPlaylist {
  _id: string;
  name: string;
  description?: string;
  coverUrl?: string;
  createdBy: string;
  createdAt: Date;
}

const PlaylistSchema = new Schema<IPlaylist>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    coverUrl: { type: String, default: "" },
    createdBy: { type: String, required: true },
  },
  { timestamps: true }
);

const Playlist: Model<IPlaylist> =
  mongoose.models.Playlist ||
  mongoose.model<IPlaylist>("Playlist", PlaylistSchema);

export default Playlist;