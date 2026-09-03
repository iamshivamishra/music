import { orderRepository } from "@/lib/repositories/order.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { earningRepository } from "@/lib/repositories/earning.repository";
import { orderFulfillmentService } from "@/lib/services/order-fulfillment";
const { fulfillOrder, fulfillGuestOrder } = orderFulfillmentService;
import { toCheckoutOrderDto, type CheckoutOrderDto } from "@/lib/serializers/order";
import { ConflictError, NotFoundError } from "@/lib/errors";
import {
  assertOrderOwner,
  ensurePaymentCapturable,
  markPendingOrderFailed,
  validateProviderPayment,
} from "@/lib/services/payment-shared";
import { toValidObjectIdOrNull } from "@/lib/security/object-id";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import type { VerifyPaymentInput } from "@/lib/validators/payment";
import type { IOrder, IPurchase } from "@/types";

export interface RazorpayWebhookEvent {
  event: string;
  payload: {
    payment?: {
      entity: {
        id: string;
        order_id: string;
      };
    };
    refund?: {
      entity: {
        id: string;
        payment_id: string;
        amount?: number;
        status?: string;
      };
    };
  };
}

export const paymentVerifyService = {
  async verifyAndRecord(
    input: VerifyPaymentInput,
    buyerId: string
  ): Promise<{ order: IOrder; purchases: IPurchase[] }> {
    const order = await orderRepository.findByRazorpayOrderId(input.orderId);
    if (!order) throw new NotFoundError("Order");

    assertOrderOwner(order, { kind: "buyer", buyerId });

    const captureState = await ensurePaymentCapturable(order, input, { userId: buyerId });
    if (captureState === "already_paid") {
      const purchases = await purchaseRepository.findByBuyerAndOrderId(buyerId, input.orderId);
      return { order, purchases };
    }

    const result = await fulfillOrder(order, input.paymentId, input.signature);

    logger.info("Payment verified and recorded", {
      orderId: order._id,
      purchaseCount: result.purchases.length,
      totalAmount: result.paidOrder.totalAmount,
    });
    audit({
      action: "payment.verified",
      userId: buyerId,
      resourceType: "order",
      resourceId: result.paidOrder._id.toString(),
      metadata: {
        purchaseCount: result.purchases.length,
        createdCount: result.createdCount,
        reusedCount: result.reusedCount,
        totalAmount: result.paidOrder.totalAmount,
      },
    });

    const updatedOrder = await orderRepository.findById(result.paidOrder._id.toString());
    if (!updatedOrder) throw new NotFoundError("Order");

    return {
      order: updatedOrder,
      purchases: result.purchases,
    };
  },

  async fulfillFromWebhook(
    razorpayOrderId: string,
    razorpayPaymentId: string
  ): Promise<void> {
    const order = await orderRepository.findByRazorpayOrderId(razorpayOrderId);
    if (!order) return;
    if (order.status === "paid") return;
    if (order.status !== "pending" && order.status !== "failed") return;

    const providerErrors = await validateProviderPayment(order, razorpayOrderId, razorpayPaymentId);
    if (providerErrors.length > 0) {
      logger.warn("Webhook fulfillment: payment validation failed", {
        orderId: order._id,
        errors: providerErrors,
      });
      return;
    }

    const isGuestOrder = !order.buyerId && !!order.guestEmail;
    const result = isGuestOrder
      ? await fulfillGuestOrder(order, razorpayPaymentId)
      : await fulfillOrder(order, razorpayPaymentId);

    logger.info("Webhook fulfillment completed", {
      orderId: order._id,
      purchaseCount: result.purchases.length,
    });
    audit({
      action: "payment.verified",
      userId: order.buyerId?.toString(),
      resourceType: "order",
      resourceId: order._id.toString(),
      metadata: { source: "webhook", purchaseCount: result.purchases.length, isGuest: isGuestOrder },
    });
  },

  async markFailedFromWebhook(
    razorpayOrderId: string,
    razorpayPaymentId: string
  ): Promise<void> {
    const order = await orderRepository.findByRazorpayOrderId(razorpayOrderId);
    if (!order || order.status !== "pending") return;

    await orderRepository.updateStatus(order._id.toString(), "failed", {
      razorpayPaymentId,
      failureReason: "Payment failed (webhook)",
    });

    logger.info("Webhook: order marked failed", {
      orderId: order._id,
      paymentId: razorpayPaymentId,
    });
    audit({
      action: "webhook.payment_failed",
      userId: order.buyerId?.toString(),
      resourceType: "order",
      resourceId: order._id.toString(),
      metadata: { paymentId: razorpayPaymentId },
    });
  },

  async handleWebhookEvent(event: RazorpayWebhookEvent): Promise<void> {
    const eventType = event.event;
    logger.info("Razorpay webhook received", { eventType });

    switch (eventType) {
      case "payment.captured": {
        const payment = event.payload.payment?.entity;
        if (!payment) return;
        await this.fulfillFromWebhook(payment.order_id, payment.id);
        audit({
          action: "webhook.payment_captured",
          resourceType: "order",
          metadata: { paymentId: payment.id, razorpayOrderId: payment.order_id },
        });
        return;
      }
      case "payment.failed": {
        const payment = event.payload.payment?.entity;
        if (!payment) return;
        await this.markFailedFromWebhook(payment.order_id, payment.id);
        return;
      }
      case "refund.processed": {
        const refund = event.payload.refund?.entity;
        if (!refund?.payment_id) return;
        const { paymentRefundService } = await import(
          "@/lib/services/payment-refund.service"
        );
        await paymentRefundService.markRefundedFromWebhook(refund.payment_id);
        return;
      }
      case "refund.failed": {
        const refund = event.payload.refund?.entity;
        logger.warn("Razorpay refund failed webhook", {
          refundId: refund?.id,
          paymentId: refund?.payment_id,
          status: refund?.status,
        });
        return;
      }
      default:
        logger.info("Webhook: unhandled event type", { eventType });
    }
  },

  async markFailed(
    razorpayOrderId: string,
    buyerId: string,
    reason: string
  ): Promise<void> {
    await markPendingOrderFailed({
      razorpayOrderId,
      reason,
      owner: { kind: "buyer", buyerId },
    });
  },

  async getOrderForBuyer(orderId: string, buyerId: string): Promise<IOrder | null> {
    if (!toValidObjectIdOrNull(orderId)) return null;
    const order = await orderRepository.findById(orderId);
    if (!order) return null;
    if (order.buyerId?.toString() !== buyerId) return null;
    return order;
  },

  async getCheckoutOrderForBuyer(
    orderId: string,
    buyerId: string
  ): Promise<CheckoutOrderDto | null> {
    const order = await this.getOrderForBuyer(orderId, buyerId);
    return order ? toCheckoutOrderDto(order) : null;
  },

  async getPurchasedBeatIds(buyerId: string): Promise<string[]> {
    return purchaseRepository.getPurchasedBeatIds(buyerId);
  },

  async getPurchasedBeatIdsForBeats(
    buyerId: string,
    beatIds: string[]
  ): Promise<string[]> {
    return purchaseRepository.getPurchasedBeatIdsForBeats(buyerId, beatIds);
  },

  async getPurchaseHistory(buyerId: string): Promise<IPurchase[]> {
    return purchaseRepository.findByBuyerId(buyerId);
  },

  async getOrderHistory(buyerId: string): Promise<IOrder[]> {
    return orderRepository.findByBuyer(buyerId);
  },

  async getProducerEarnings(producerId: string): Promise<number> {
    return earningRepository.sumGrossByProducer(producerId);
  },

  async verifyGuestPayment(input: VerifyPaymentInput, guestEmail: string) {
    const { guestPaymentService } = await import("@/lib/services/guest-payment.service");
    return guestPaymentService.verifyGuestPayment(input, guestEmail);
  },
};
