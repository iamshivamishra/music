import mongoose, { Schema, type Model } from "mongoose";
import type { IProducerCustomerNote } from "@/types";

const ProducerCustomerNoteSchema = new Schema<IProducerCustomerNote>(
  {
    producerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    buyerId: { type: Schema.Types.ObjectId, ref: "User" },
    guestEmailHash: { type: String },
    note: { type: String, required: true, maxlength: 1000 },
  },
  { timestamps: true }
);

ProducerCustomerNoteSchema.index(
  { producerId: 1, buyerId: 1 },
  { unique: true, sparse: true }
);
ProducerCustomerNoteSchema.index(
  { producerId: 1, guestEmailHash: 1 },
  { unique: true, sparse: true }
);
ProducerCustomerNoteSchema.index({ producerId: 1 });

const ProducerCustomerNote: Model<IProducerCustomerNote> =
  mongoose.models.ProducerCustomerNote ||
  mongoose.model<IProducerCustomerNote>(
    "ProducerCustomerNote",
    ProducerCustomerNoteSchema
  );

export default ProducerCustomerNote;
