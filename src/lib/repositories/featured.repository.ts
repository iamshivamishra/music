import { connectDB } from "@/lib/db";
import FeaturedBeat from "@/lib/models/FeaturedBeat";
import type { IFeaturedBeat, FeaturedSection } from "@/types";

export const featuredRepository = {
  async findActive(section: FeaturedSection, limit = 10): Promise<IFeaturedBeat[]> {
    await connectDB();
    const now = new Date();
    return FeaturedBeat.find({
      section,
      startDate: { $lte: now },
      endDate: { $gte: now },
    })
      .sort({ position: 1 })
      .limit(limit)
      .lean<IFeaturedBeat[]>();
  },

  async findAll(section: FeaturedSection): Promise<IFeaturedBeat[]> {
    await connectDB();
    return FeaturedBeat.find({ section })
      .sort({ position: 1 })
      .lean<IFeaturedBeat[]>();
  },

  async findAllSections(): Promise<IFeaturedBeat[]> {
    await connectDB();
    return FeaturedBeat.find()
      .sort({ section: 1, position: 1 })
      .lean<IFeaturedBeat[]>();
  },

  async create(data: Omit<IFeaturedBeat, "_id" | "createdAt" | "updatedAt">): Promise<IFeaturedBeat> {
    await connectDB();
    const doc = await FeaturedBeat.create(data);
    return doc.toObject() as IFeaturedBeat;
  },

  async delete(id: string): Promise<boolean> {
    await connectDB();
    const result = await FeaturedBeat.findByIdAndDelete(id);
    return !!result;
  },

  async findById(id: string): Promise<IFeaturedBeat | null> {
    await connectDB();
    return FeaturedBeat.findById(id).lean<IFeaturedBeat>();
  },
};
