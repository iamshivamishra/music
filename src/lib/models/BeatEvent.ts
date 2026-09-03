import mongoose, { Schema, type Model } from "mongoose";
import {
  ATTRIBUTION_SOURCES,
  BEAT_EVENT_KINDS,
  type IBeatEvent,
} from "@/types";

const BeatEventSchema = new Schema<IBeatEvent>(
  {
    beatId: { type: Schema.Types.ObjectId, ref: "Beat", required: true },
    producerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    kind: {
      type: String,
      enum: [...BEAT_EVENT_KINDS],
      required: true,
    },
    source: {
      type: String,
      enum: [...ATTRIBUTION_SOURCES],
      required: true,
    },
  },
  { timestamps: true },
);

BeatEventSchema.index({ producerId: 1, createdAt: -1 });
BeatEventSchema.index({ beatId: 1, kind: 1, createdAt: -1 });
BeatEventSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

const BeatEvent: Model<IBeatEvent> =
  mongoose.models.BeatEvent ||
  mongoose.model<IBeatEvent>("BeatEvent", BeatEventSchema);

export default BeatEvent;
