import { connectDB } from "@/lib/db";
import License from "@/lib/models/License";
import type { ILicense } from "@/types";
import type { ClientSession } from "mongoose";

interface RepoOptions {
  session?: ClientSession;
}

export const licenseRepository = {
  async findByBeatId(beatId: string, activeOnly = true): Promise<ILicense[]> {
    await connectDB();
    const query: Record<string, unknown> = { beatId };
    if (activeOnly) query.isActive = true;
    return License.find(query).sort({ price: 1 }).lean<ILicense[]>();
  },

  async findById(id: string, options: RepoOptions = {}): Promise<ILicense | null> {
    await connectDB();
    return License.findById(id).session(options.session ?? null).lean<ILicense>();
  },

  async create(data: Partial<ILicense>): Promise<ILicense> {
    await connectDB();
    const license = await License.create(data);
    return license.toObject() as ILicense;
  },

  async createMany(data: Partial<ILicense>[]): Promise<ILicense[]> {
    await connectDB();
    const licenses = await License.insertMany(data);
    return licenses.map((l) => l.toObject() as ILicense);
  },

  async update(id: string, data: Partial<ILicense>): Promise<ILicense | null> {
    await connectDB();
    return License.findByIdAndUpdate(id, data, { new: true }).lean<ILicense>();
  },

  async delete(id: string): Promise<boolean> {
    await connectDB();
    const result = await License.findByIdAndDelete(id);
    return !!result;
  },

  async deleteByBeatId(beatId: string, options: RepoOptions = {}): Promise<number> {
    await connectDB();
    const result = await License.deleteMany({ beatId }, { session: options.session });
    return result.deletedCount;
  },

  async findCheapestForBeat(beatId: string): Promise<ILicense | null> {
    await connectDB();
    return License.findOne({ beatId, isActive: true })
      .sort({ price: 1 })
      .lean<ILicense>();
  },
};
