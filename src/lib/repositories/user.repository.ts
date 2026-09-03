import { connectDB } from "@/lib/db";
import User from "@/lib/models/User";
import type { IProducerStore, IUser } from "@/types";
import type { ClientSession } from "mongoose";

interface RepoOptions {
  session?: ClientSession;
}

export const userRepository = {
  async findByEmail(email: string, includePassword = false): Promise<IUser | null> {
    await connectDB();
    const query = User.findOne({ email: email.toLowerCase() });
    if (includePassword) query.select("+password");
    return query.lean<IUser>();
  },

  async findByEmails(emails: string[]): Promise<IUser[]> {
    await connectDB();
    if (emails.length === 0) return [];
    const normalized = emails.map((email) => email.toLowerCase());
    return User.find({ email: { $in: normalized } }).lean<IUser[]>();
  },

  async findById(id: string, includePassword = false): Promise<IUser | null> {
    await connectDB();
    const query = User.findById(id);
    if (includePassword) query.select("+password");
    return query.lean<IUser>();
  },

  async findByIdWithTaxProfile(id: string): Promise<IUser | null> {
    await connectDB();
    return User.findById(id).select("+taxProfile").lean<IUser>();
  },

  async findByIds(ids: string[]): Promise<IUser[]> {
    await connectDB();
    if (ids.length === 0) return [];
    return User.find({ _id: { $in: ids } }).lean<IUser[]>();
  },

  async findByUsername(username: string): Promise<IUser | null> {
    await connectDB();
    return User.findOne({ username: username.toLowerCase() }).lean<IUser>();
  },

  /** @deprecated Use findByUsername instead */
  async findBySlug(slug: string): Promise<IUser | null> {
    await connectDB();
    return User.findOne({
      $or: [
        { username: slug.toLowerCase() },
        { producerSlug: slug.toLowerCase() },
      ],
    }).lean<IUser>();
  },

  async create(data: Partial<IUser>): Promise<IUser> {
    await connectDB();
    const user = await User.create(data);
    const { password: _, ...userWithoutPassword } = user.toObject();
    return userWithoutPassword as unknown as IUser;
  },

  async update(id: string, data: Partial<IUser>, options: RepoOptions = {}): Promise<IUser | null> {
    await connectDB();
    return User.findByIdAndUpdate(id, data, { new: true, session: options.session }).lean<IUser>();
  },

  async updateAndUnset(
    id: string,
    set: Record<string, unknown>,
    unset: string[],
    options: RepoOptions = {}
  ): Promise<IUser | null> {
    await connectDB();
    const update: Record<string, unknown> = {};
    if (Object.keys(set).length > 0) update.$set = set;
    if (unset.length > 0) {
      update.$unset = Object.fromEntries(unset.map((field) => [field, 1]));
    }
    if (Object.keys(update).length === 0) {
      return this.findById(id);
    }
    return User.findByIdAndUpdate(id, update, {
      new: true,
      session: options.session,
    }).lean<IUser>();
  },

  async findExpiredFoundingProducers(): Promise<IUser[]> {
    await connectDB();
    return User.find({
      producerTier: "founding",
      producerTierExpiresAt: { $lt: new Date() },
    })
      .select("name email producerTier producerTierExpiresAt platformFeeOverride")
      .lean<IUser[]>();
  },

  async updateStore(producerId: string, store: IProducerStore): Promise<IUser | null> {
    await connectDB();
    return User.findByIdAndUpdate(
      producerId,
      { $set: { store } },
      { new: true }
    ).lean<IUser>();
  },

  async usernameExists(username: string, excludeUserId?: string): Promise<boolean> {
    await connectDB();
    const query: Record<string, unknown> = { username: username.toLowerCase() };
    if (excludeUserId) query._id = { $ne: excludeUserId };
    return (await User.countDocuments(query)) > 0;
  },

  /** @deprecated Use usernameExists instead */
  async slugExists(slug: string, excludeUserId?: string): Promise<boolean> {
    await connectDB();
    const query: Record<string, unknown> = {
      $or: [
        { username: slug.toLowerCase() },
        { producerSlug: slug.toLowerCase() },
      ],
    };
    if (excludeUserId) query._id = { $ne: excludeUserId };
    return (await User.countDocuments(query)) > 0;
  },

  async findProducerIdsBySearch(query: string): Promise<string[]> {
    await connectDB();
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const producers = await User.find(
      {
        role: "producer",
        $or: [
          { name: { $regex: escaped, $options: "i" } },
          { displayName: { $regex: escaped, $options: "i" } },
          { username: { $regex: escaped, $options: "i" } },
        ],
      },
      { _id: 1 }
    ).lean();
    return producers.map((p) => p._id.toString());
  },

  async findProducers(limit = 20): Promise<IUser[]> {
    await connectDB();
    return User.find({ role: "producer" })
      .sort({ salesCount: -1, createdAt: -1 })
      .limit(limit)
      .lean<IUser[]>();
  },

  async findFoundingProducers(limit = 12): Promise<IUser[]> {
    await connectDB();
    return User.find({
      role: "producer",
      producerTier: "founding",
      $or: [
        { producerTierExpiresAt: { $gt: new Date() } },
        { producerTierExpiresAt: null },
      ],
    })
      .select("name displayName username avatarUrl producerTier")
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean<IUser[]>();
  },

  async searchProducersByUsername(
    query: string,
    limit = 8
  ): Promise<Pick<IUser, "_id" | "username" | "displayName" | "name" | "avatarUrl">[]> {
    await connectDB();
    const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return User.find({
      role: { $in: ["producer", "admin"] },
      username: { $regex: `^${escaped}`, $options: "i" },
    })
      .select("username displayName name avatarUrl")
      .limit(limit)
      .lean<Pick<IUser, "_id" | "username" | "displayName" | "name" | "avatarUrl">[]>();
  },

  async incrementSalesCount(producerId: string, options: RepoOptions = {}): Promise<void> {
    await connectDB();
    await User.findByIdAndUpdate(
      producerId,
      { $inc: { salesCount: 1 } },
      { session: options.session }
    );
  },

  async incrementFollowersCount(userId: string, options: RepoOptions = {}): Promise<void> {
    await connectDB();
    await User.findByIdAndUpdate(
      userId,
      { $inc: { followersCount: 1 } },
      { session: options.session }
    );
  },

  async decrementFollowersCount(userId: string, options: RepoOptions = {}): Promise<void> {
    await connectDB();
    await User.updateOne(
      { _id: userId, followersCount: { $gt: 0 } },
      { $inc: { followersCount: -1 } },
      { session: options.session }
    );
  },

  async setFollowersCount(userId: string, count: number, options: RepoOptions = {}): Promise<void> {
    await connectDB();
    await User.findByIdAndUpdate(
      userId,
      { $set: { followersCount: Math.max(0, count) } },
      { session: options.session }
    );
  },

  async setResetToken(
    userId: string,
    hash: string,
    expiry: Date
  ): Promise<void> {
    await connectDB();
    await User.findByIdAndUpdate(userId, {
      resetTokenHash: hash,
      resetTokenExpiry: expiry,
    });
  },

  async findByResetToken(hash: string): Promise<IUser | null> {
    await connectDB();
    return User.findOne({
      resetTokenHash: hash,
      resetTokenExpiry: { $gt: new Date() },
    })
      .select("+resetTokenHash +resetTokenExpiry")
      .lean<IUser>();
  },

  async clearResetToken(userId: string): Promise<void> {
    await connectDB();
    await User.findByIdAndUpdate(userId, {
      $unset: { resetTokenHash: 1, resetTokenExpiry: 1 },
    });
  },

  async updatePasswordAndClearResetToken(
    userId: string,
    hashedPassword: string
  ): Promise<void> {
    await connectDB();
    await User.findByIdAndUpdate(userId, {
      $set: { password: hashedPassword },
      $unset: { resetTokenHash: 1, resetTokenExpiry: 1 },
    });
  },

  async countByRole(role: string): Promise<number> {
    await connectDB();
    return User.countDocuments({ role });
  },

  async countAll(): Promise<number> {
    await connectDB();
    return User.countDocuments();
  },

  async findAllPaginated({ page, limit }: { page: number; limit: number }) {
    await connectDB();
    return User.find()
      .select("name email role verified salesCount createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();
  },

  async updateRole(userId: string, role: "buyer" | "producer" | "admin"): Promise<IUser | null> {
    await connectDB();
    return User.findByIdAndUpdate(userId, { role }, { new: true }).lean<IUser>();
  },

  async setVerified(userId: string, verified: boolean): Promise<IUser | null> {
    await connectDB();
    return User.findByIdAndUpdate(userId, { verified }, { new: true }).lean<IUser>();
  },

  async findProducersForSitemap(limit = 200): Promise<{ username: string; updatedAt: Date }[]> {
    await connectDB();
    return User.find({ role: "producer", username: { $exists: true, $ne: "" } })
      .select("username updatedAt")
      .sort({ salesCount: -1 })
      .limit(limit)
      .lean<{ username: string; updatedAt: Date }[]>();
  },

  async findProducersAdmin(limit = 200): Promise<IUser[]> {
    await connectDB();
    return User.find({ role: { $in: ["producer", "admin"] } })
      .select(
        "name username email verified salesCount producerTier producerTierExpiresAt platformFeeOverride createdAt"
      )
      .sort({ salesCount: -1, createdAt: -1 })
      .limit(limit)
      .lean<IUser[]>();
  },

  async findProducersWithField(
    field: string
  ): Promise<Array<{ _id: string; [key: string]: unknown }>> {
    await connectDB();
    return User.find({ role: "producer" })
      .select(`_id ${field}`)
      .lean<Array<{ _id: string; [key: string]: unknown }>>();
  },

  async findAllWithField(
    field: string
  ): Promise<Array<{ _id: string; [key: string]: unknown }>> {
    await connectDB();
    return User.find()
      .select(`_id ${field}`)
      .lean<Array<{ _id: string; [key: string]: unknown }>>();
  },

  async bulkUpdateSalesCount(
    updates: Array<{ id: string; salesCount: number }>
  ): Promise<void> {
    await connectDB();
    await User.bulkWrite(
      updates.map((u) => ({
        updateOne: {
          filter: { _id: u.id },
          update: { $set: { salesCount: u.salesCount } },
        },
      }))
    );
  },

  async bulkUpdateFollowersCount(
    updates: Array<{ id: string; followersCount: number }>
  ): Promise<void> {
    await connectDB();
    await User.bulkWrite(
      updates.map((u) => ({
        updateOne: {
          filter: { _id: u.id },
          update: { $set: { followersCount: u.followersCount } },
        },
      }))
    );
  },
};
