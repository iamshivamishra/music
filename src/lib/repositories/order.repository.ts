import { connectDB } from "@/lib/db";
import Order from "@/lib/models/Order";
import type { IOrder, OrderStatus } from "@/types";

export const orderRepository = {
  async create(data: Partial<IOrder>): Promise<IOrder> {
    await connectDB();
    const order = await Order.create(data);
    return order.toObject() as IOrder;
  },

  async findById(id: string): Promise<IOrder | null> {
    await connectDB();
    return Order.findById(id).lean<IOrder>();
  },

  async findByRazorpayOrderId(razorpayOrderId: string): Promise<IOrder | null> {
    await connectDB();
    return Order.findOne({ razorpayOrderId }).lean<IOrder>();
  },

  async updateStatus(
    id: string,
    status: OrderStatus,
    paymentData?: {
      razorpayPaymentId?: string;
      razorpaySignature?: string;
      paidAt?: Date;
      failureReason?: string;
    }
  ): Promise<IOrder | null> {
    await connectDB();
    return Order.findByIdAndUpdate(
      id,
      { status, ...paymentData },
      { new: true }
    ).lean<IOrder>();
  },

  async findByBuyer(buyerId: string, status?: OrderStatus): Promise<IOrder[]> {
    await connectDB();
    const query: Record<string, unknown> = { buyerId };
    if (status) query.status = status;
    return Order.find(query).sort({ createdAt: -1 }).lean<IOrder[]>();
  },

  async countByBuyer(buyerId: string): Promise<number> {
    await connectDB();
    return Order.countDocuments({ buyerId, status: "paid" });
  },
};
