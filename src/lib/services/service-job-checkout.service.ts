import { orderRepository } from "@/lib/repositories/order.repository";
import { serviceJobRepository } from "@/lib/repositories/service-job.repository";
import { generateReceipt, placeRazorpayOrder } from "@/lib/services/payment-shared";
import type { IOrder, IOrderItem, IServiceJob } from "@/types";

export interface ServiceCheckoutResult {
  orderId: string;
  amount: number;
  currency: string;
  internalOrderId: string;
  jobId: string;
  serviceTitle: string;
}

export const serviceJobCheckoutService = {
  async createPayment(
    job: IServiceJob,
    buyerId: string,
    amount: number,
    kind: "service_deposit" | "service_balance",
    title: string
  ): Promise<ServiceCheckoutResult> {
    const receipt = generateReceipt();
    const order = await orderRepository.create({
      buyerId: buyerId as unknown as IOrder["buyerId"],
      items: [
        {
          kind,
          serviceJobId: job._id as unknown as IOrderItem["serviceJobId"],
          serviceTitle: title,
          price: amount,
        },
      ],
      totalAmount: amount,
      subtotalAmount: amount,
      receipt,
      status: "pending",
    });

    const placed = await placeRazorpayOrder(order, {
      jobId: job._id.toString(),
      kind,
      buyerId,
    });

    const orderField = kind === "service_deposit" ? "depositOrderId" : "balanceOrderId";
    await serviceJobRepository.update(job._id.toString(), {
      [orderField]: order._id as unknown as IServiceJob["depositOrderId"],
    });

    return {
      ...placed,
      jobId: job._id.toString(),
      serviceTitle: title,
    };
  },
};
