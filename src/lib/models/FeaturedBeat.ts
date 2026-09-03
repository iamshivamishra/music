import mongoose, { Schema, type Model } from "mongoose";
import type { IFeaturedBeat } from "@/types";

const FeaturedBeatSchema = new Schema<IFeaturedBeat>(
  {
    beatId: { type: Schema.Types.ObjectId, ref: "Beat", required: true },
    position: { type: Number, required: true, min: 1 },
    section: {
      type: String,
      enum: ["editor_picks", "featured"],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    addedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true },
);

FeaturedBeatSchema.index({ section: 1, startDate: 1, endDate: 1 });
FeaturedBeatSchema.index({ beatId: 1, section: 1 }, { unique: true });

const FeaturedBeat: Model<IFeaturedBeat> =
  mongoose.models.FeaturedBeat ||
  mongoose.model<IFeaturedBeat>("FeaturedBeat", FeaturedBeatSchema);

export default FeaturedBeat;
