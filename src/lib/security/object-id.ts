import mongoose from "mongoose";

export function toValidObjectIdOrNull(value: string): mongoose.Types.ObjectId | null {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    return null;
  }
  return new mongoose.Types.ObjectId(value);
}
