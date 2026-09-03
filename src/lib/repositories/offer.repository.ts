import { connectDB } from "@/lib/db";
import Offer from "@/lib/models/Offer";
import type { IOffer, OfferStatus, PaginatedResult } from "@/types";
import type { ClientSession } from "mongoose";

interface RepoOptions {
  session?: ClientSession;
}

export const offerRepository = {
  async create(data: Partial<IOffer>, options: RepoOptions = {}): Promise<IOffer> {
    await connectDB();
    const [offer] = await Offer.create([data], { session: options.session });
    return offer.toObject() as IOffer;
  },

  async findById(id: string, options: RepoOptions = {}): Promise<IOffer | null> {
    await connectDB();
    return Offer.findById(id).session(options.session ?? null).lean<IOffer>();
  },

  async findByToken(token: string, options: RepoOptions = {}): Promise<IOffer | null> {
    await connectDB();
    return Offer.findOne({ token }).session(options.session ?? null).lean<IOffer>();
  },

  async findByProducer(
    producerId: string,
    statuses: OfferStatus[],
    page = 1,
    limit = 20
  ): Promise<PaginatedResult<IOffer>> {
    await connectDB();
    const filter = { producerId, status: { $in: statuses } };
    const [data, total] = await Promise.all([
      Offer.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<IOffer[]>(),
      Offer.countDocuments(filter),
    ]);
    const totalPages = Math.ceil(total / limit) || 1;
    return {
      data,
      total,
      page,
      limit,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  },

  async convertRequest(
    id: string,
    producerId: string,
    data: Partial<IOffer>
  ): Promise<IOffer | null> {
    await connectDB();
    return Offer.findOneAndUpdate(
      { _id: id, producerId, status: "pending_request" },
      { $set: data },
      { new: true }
    ).lean<IOffer>();
  },

  async acceptIfOpen(
    id: string,
    fields: { acceptedOrderId: string; acceptedPurchaseId?: string },
    options: RepoOptions = {}
  ): Promise<IOffer | null> {
    await connectDB();
    return Offer.findOneAndUpdate(
      { _id: id, status: "open", expiresAt: { $gt: new Date() } },
      {
        $set: {
          status: "accepted",
          acceptedOrderId: fields.acceptedOrderId,
          ...(fields.acceptedPurchaseId
            ? { acceptedPurchaseId: fields.acceptedPurchaseId }
            : {}),
        },
      },
      { new: true, session: options.session }
    ).lean<IOffer>();
  },

  async setAcceptedPurchaseId(
    id: string,
    purchaseId: string,
    options: RepoOptions = {}
  ): Promise<void> {
    await connectDB();
    await Offer.updateOne(
      { _id: id },
      { $set: { acceptedPurchaseId: purchaseId } },
      { session: options.session }
    );
  },

  async markExpiredIfOpen(id: string): Promise<IOffer | null> {
    await connectDB();
    return Offer.findOneAndUpdate(
      { _id: id, status: "open", expiresAt: { $lte: new Date() } },
      { $set: { status: "expired" } },
      { new: true }
    ).lean<IOffer>();
  },

  async markExpiredForProducer(producerId: string): Promise<void> {
    await connectDB();
    await Offer.updateMany(
      { producerId, status: "open", expiresAt: { $lte: new Date() } },
      { $set: { status: "expired" } }
    );
  },

  async withdrawIfOwned(id: string, producerId: string): Promise<IOffer | null> {
    await connectDB();
    return Offer.findOneAndUpdate(
      { _id: id, producerId, status: { $in: ["pending_request", "open"] } },
      { $set: { status: "withdrawn" } },
      { new: true }
    ).lean<IOffer>();
  },
};
