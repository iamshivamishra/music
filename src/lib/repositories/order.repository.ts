import { connectDB } from "@/lib/db";
import Order from "@/lib/models/Order";
import { toValidObjectIdOrNull } from "@/lib/security/object-id";
import type { IOrder, OrderStatus, PaginatedResult } from "@/types";
import type { ClientSession } from "mongoose";

interface RepoOptions {
  session?: ClientSession;
}

export const orderRepository = {
  async create(data: Partial<IOrder>, options: RepoOptions = {}): Promise<IOrder> {
    await connectDB();
    const order = await Order.create([data], { session: options.session });
    return order[0].toObject() as IOrder;
  },

  async attachRazorpayOrderId(
    id: string,
    razorpayOrderId: string,
    options: RepoOptions = {}
  ): Promise<IOrder | null> {
    await connectDB();
    return Order.findByIdAndUpdate(
      id,
      { razorpayOrderId },
      { new: true, session: options.session }
    ).lean<IOrder>();
  },

  async findById(id: string, options: RepoOptions = {}): Promise<IOrder | null> {
    await connectDB();
    return Order.findById(id).session(options.session ?? null).lean<IOrder>();
  },

  async findByRazorpayOrderId(
    razorpayOrderId: string,
    options: RepoOptions = {}
  ): Promise<IOrder | null> {
    await connectDB();
    return Order.findOne({ razorpayOrderId }).session(options.session ?? null).lean<IOrder>();
  },

  async findPendingByBuyerAndBeat(
    buyerId: string,
    beatId: string,
    options: RepoOptions = {}
  ): Promise<IOrder | null> {
    await connectDB();
    return Order.findOne({
      buyerId,
      status: "pending",
      "items.beatId": beatId,
    })
      .sort({ createdAt: -1 })
      .session(options.session ?? null)
      .lean<IOrder>();
  },

  async findPendingByBuyerAndBeatIds(
    buyerId: string,
    beatIds: string[],
    options: RepoOptions = {}
  ): Promise<IOrder | null> {
    await connectDB();
    if (beatIds.length === 0) return null;
    return Order.findOne({
      buyerId,
      status: "pending",
      "items.beatId": { $in: beatIds },
    })
      .sort({ createdAt: -1 })
      .session(options.session ?? null)
      .lean<IOrder>();
  },

  async updateStatus(
    id: string,
    status: OrderStatus,
    paymentData?: {
      razorpayPaymentId?: string;
      razorpaySignature?: string;
      paidAt?: Date;
      failureReason?: string;
    },
    options: RepoOptions = {}
  ): Promise<IOrder | null> {
    await connectDB();
    return Order.findByIdAndUpdate(
      id,
      { status, ...paymentData },
      { new: true, session: options.session }
    ).lean<IOrder>();
  },

  async markPaidIfPending(
    id: string,
    paymentData: {
      razorpayPaymentId: string;
      razorpaySignature?: string;
      paidAt: Date;
    },
    options: RepoOptions = {}
  ): Promise<IOrder | null> {
    await connectDB();
    return Order.findOneAndUpdate(
      { _id: id, status: { $in: ["pending", "failed"] } },
      {
        $set: { status: "paid", ...paymentData },
        $unset: { failureReason: 1 },
      },
      { new: true, session: options.session }
    ).lean<IOrder>();
  },

  async findByBuyer(
    buyerId: string,
    status?: OrderStatus,
    options: RepoOptions = {}
  ): Promise<IOrder[]> {
    await connectDB();
    const query: Record<string, unknown> = { buyerId };
    if (status) query.status = status;
    return Order.find(query)
      .sort({ createdAt: -1 })
      .session(options.session ?? null)
      .lean<IOrder[]>();
  },

  async countByBuyer(buyerId: string, options: RepoOptions = {}): Promise<number> {
    await connectDB();
    return Order.countDocuments({ buyerId, status: "paid" }).session(options.session ?? null);
  },

  async updateInvoiceFields(
    orderId: string,
    fields: { invoiceNumber?: string; invoicePdfKey?: string; gstBreakup?: IOrder["gstBreakup"] },
    options: RepoOptions = {}
  ): Promise<IOrder | null> {
    await connectDB();
    return Order.findByIdAndUpdate(orderId, { $set: fields }, {
      new: true,
      session: options.session,
    }).lean<IOrder>();
  },

  async getNextInvoiceNumber(): Promise<string> {
    await connectDB();
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const lastInvoice = await Order.findOne({
      invoiceNumber: { $regex: `^${prefix}` },
    })
      .sort({ invoiceNumber: -1 })
      .select("invoiceNumber")
      .lean<Pick<IOrder, "invoiceNumber">>();

    const lastSeq = lastInvoice?.invoiceNumber
      ? parseInt(lastInvoice.invoiceNumber.replace(prefix, ""), 10)
      : 0;
    return `${prefix}${String(lastSeq + 1).padStart(4, "0")}`;
  },

  async findByBuyerPaginated(
    buyerId: string,
    { page, limit, status }: { page: number; limit: number; status?: OrderStatus }
  ): Promise<PaginatedResult<IOrder>> {
    await connectDB();
    const filter: Record<string, unknown> = { buyerId };
    if (status) filter.status = status;
    const [data, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean<IOrder[]>(),
      Order.countDocuments(filter),
    ]);
    const totalPages = Math.ceil(total / limit);
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

  async findByDownloadToken(token: string): Promise<IOrder | null> {
    await connectDB();
    return Order.findOne({
      downloadToken: token,
      downloadTokenExpiry: { $gt: new Date() },
    }).lean<IOrder>();
  },

  async findByDownloadTokenAny(token: string): Promise<IOrder | null> {
    await connectDB();
    return Order.findOne({ downloadToken: token }).lean<IOrder>();
  },

  async setDownloadToken(
    id: string,
    token: string,
    expiry: Date,
    options: RepoOptions = {}
  ): Promise<IOrder | null> {
    await connectDB();
    return Order.findByIdAndUpdate(
      id,
      { downloadToken: token, downloadTokenExpiry: expiry },
      { new: true, session: options.session }
    ).lean<IOrder>();
  },

  async linkGuestOrders(guestEmail: string, buyerId: string, options: RepoOptions = {}): Promise<number> {
    await connectDB();
    const result = await Order.updateMany(
      { guestEmail, status: "paid", buyerId: { $exists: false } },
      { $set: { buyerId }, $unset: { guestEmail: 1 } },
      { session: options.session }
    );
    return result.modifiedCount;
  },

  async findPendingByGuestEmailAndBeat(
    guestEmail: string,
    beatId: string,
  ): Promise<IOrder | null> {
    await connectDB();
    return Order.findOne({
      guestEmail,
      status: "pending",
      "items.beatId": beatId,
    })
      .sort({ createdAt: -1 })
      .lean<IOrder>();
  },

  async findByRazorpayPaymentId(
    razorpayPaymentId: string,
    options: RepoOptions = {}
  ): Promise<IOrder | null> {
    await connectDB();
    return Order.findOne({ razorpayPaymentId })
      .session(options.session ?? null)
      .lean<IOrder>();
  },

  async findPendingByOfferId(offerId: string): Promise<IOrder | null> {
    await connectDB();
    return Order.findOne({ offerId, status: "pending" })
      .sort({ createdAt: -1 })
      .lean<IOrder>();
  },

  async findByRazorpayOrderIds(ids: string[]): Promise<IOrder[]> {
    await connectDB();
    const unique = [...new Set(ids.filter(Boolean))];
    if (unique.length === 0) return [];

    const objectIds = unique
      .map((id) => toValidObjectIdOrNull(id))
      .filter((id): id is NonNullable<typeof id> => id !== null);

    const query =
      objectIds.length > 0
        ? { $or: [{ razorpayOrderId: { $in: unique } }, { _id: { $in: objectIds } }] }
        : { razorpayOrderId: { $in: unique } };

    return Order.find(query)
      .select("razorpayOrderId invoiceNumber gstBreakup status couponCode guestEmail buyerId")
      .lean<IOrder[]>();
  },
};
