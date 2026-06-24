import { connectDB } from "@/lib/db";
import CartItem from "@/lib/models/Cart";
import type { ICartItem } from "@/types";
import type { ClientSession } from "mongoose";

interface RepoOptions {
  session?: ClientSession;
}

export const cartRepository = {
  async findByUser(userId: string): Promise<ICartItem[]> {
    await connectDB();
    return CartItem.find({ userId }).sort({ addedAt: -1 }).lean<ICartItem[]>();
  },

  async findOne(userId: string, beatId: string): Promise<ICartItem | null> {
    await connectDB();
    return CartItem.findOne({ userId, beatId }).lean<ICartItem>();
  },

  async add(userId: string, beatId: string, licenseId: string): Promise<ICartItem> {
    await connectDB();
    const item = await CartItem.findOneAndUpdate(
      { userId, beatId },
      { userId, beatId, licenseId, addedAt: new Date() },
      { upsert: true, new: true }
    ).lean<ICartItem>();
    return item!;
  },

  async updateLicense(userId: string, beatId: string, licenseId: string): Promise<ICartItem | null> {
    await connectDB();
    return CartItem.findOneAndUpdate(
      { userId, beatId },
      { licenseId },
      { new: true }
    ).lean<ICartItem>();
  },

  async remove(userId: string, beatId: string): Promise<boolean> {
    await connectDB();
    const result = await CartItem.deleteOne({ userId, beatId });
    return result.deletedCount > 0;
  },

  async clear(userId: string, options: RepoOptions = {}): Promise<number> {
    await connectDB();
    const result = await CartItem.deleteMany({ userId }, { session: options.session });
    return result.deletedCount;
  },

  async count(userId: string): Promise<number> {
    await connectDB();
    return CartItem.countDocuments({ userId });
  },
};
