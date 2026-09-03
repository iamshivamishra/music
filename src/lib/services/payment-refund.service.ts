import { orderRepository } from "@/lib/repositories/order.repository";
import { servicePaymentRepository } from "@/lib/repositories/service-payment.repository";
import { refundPayment } from "@/lib/razorpay";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import type { IOrder } from "@/types";

export const paymentRefundService = {
  async refundOrder(orderId: string): Promise<IOrder> {
    const order = await orderRepository.findById(orderId);
    if (!order) throw new NotFoundError("Order");
    if (order.status === "refunded") return order;
    if (order.status !== "paid") {
      throw new ConflictError("Only paid orders can be refunded");
    }
    if (!order.razorpayPaymentId) {
      throw new ConflictError("Order has no Razorpay payment to refund");
    }

    try {
      await refundPayment(order.razorpayPaymentId, order.totalAmount);
    } catch (error) {
      logger.error("Razorpay refund failed", {
        orderId,
        paymentId: order.razorpayPaymentId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw new ConflictError("Refund could not be processed. Try again shortly.");
    }

    const updated = await orderRepository.updateStatus(orderId, "refunded");
    if (!updated) throw new NotFoundError("Order");

    if (
      order.items.some(
        (item) => item.kind === "service_deposit" || item.kind === "service_balance"
      )
    ) {
      await servicePaymentRepository.markRefundedByOrderId(orderId);
    }

    audit({
      action: "payment.refunded",
      userId: order.buyerId?.toString(),
      resourceType: "order",
      resourceId: orderId,
      metadata: { amount: order.totalAmount },
    });
    logger.info("Order refunded", { orderId, amount: order.totalAmount });
    return updated;
  },

  async markRefundedFromWebhook(razorpayPaymentId: string): Promise<void> {
    const order = await orderRepository.findByRazorpayPaymentId(razorpayPaymentId);
    if (!order) return;
    if (order.status === "refunded") return;
    if (order.status !== "paid") return;

    await orderRepository.updateStatus(order._id.toString(), "refunded");
    if (
      order.items.some(
        (item) => item.kind === "service_deposit" || item.kind === "service_balance"
      )
    ) {
      await servicePaymentRepository.markRefundedByOrderId(order._id.toString());
    }
    audit({
      action: "payment.refunded",
      userId: order.buyerId?.toString(),
      resourceType: "order",
      resourceId: order._id.toString(),
      metadata: { source: "webhook", paymentId: razorpayPaymentId },
    });
  },
};
