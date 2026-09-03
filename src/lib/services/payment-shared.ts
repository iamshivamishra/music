import { fetchPaymentById, razorpay, verifySignature } from "@/lib/razorpay";
import { orderRepository } from "@/lib/repositories/order.repository";
import { ConflictError, ValidationError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import type { CreatedCheckoutOrder } from "@/lib/serializers/order";
import type { VerifyPaymentInput } from "@/lib/validators/payment";
import type { IOrder } from "@/types";

export function generateReceipt(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).substring(2, 8);
  return `rcpt_${ts}_${rand}`;
}

export async function placeRazorpayOrder(
  order: IOrder,
  notes: Record<string, string> = {}
): Promise<CreatedCheckoutOrder> {
  const razorpayOrder = await razorpay.orders.create({
    amount: order.totalAmount * 100,
    currency: "INR",
    receipt: order.receipt,
    notes: {
      internalOrderId: order._id.toString(),
      ...notes,
    },
  });
  await orderRepository.attachRazorpayOrderId(order._id.toString(), razorpayOrder.id);

  return {
    orderId: razorpayOrder.id,
    amount: order.totalAmount,
    currency: "INR",
    internalOrderId: order._id.toString(),
  };
}

export function normalizeGuestEmail(email: string): string {
  return email.toLowerCase().trim();
}

export type PaymentOwner =
  | { kind: "buyer"; buyerId: string }
  | { kind: "guest"; guestEmail: string };

export function assertOrderOwner(order: IOrder, owner: PaymentOwner): void {
  if (owner.kind === "buyer") {
    if (order.buyerId?.toString() !== owner.buyerId) {
      throw new ConflictError("Order does not belong to this user");
    }
    return;
  }

  const orderEmail = order.guestEmail ? normalizeGuestEmail(order.guestEmail) : "";
  if (orderEmail !== normalizeGuestEmail(owner.guestEmail)) {
    throw new ConflictError("Order does not belong to this email");
  }
}

export async function validateProviderPayment(
  order: IOrder,
  razorpayOrderId: string,
  razorpayPaymentId: string
): Promise<string[]> {
  const providerPayment = await fetchPaymentById(razorpayPaymentId);
  const expectedAmountPaise = order.totalAmount * 100;
  const errors: string[] = [];

  if (providerPayment.order_id !== razorpayOrderId) {
    errors.push("Payment does not belong to this order");
  }
  if (providerPayment.status !== "captured") {
    errors.push("Payment is not captured");
  }
  if (providerPayment.amount !== expectedAmountPaise) {
    errors.push("Payment amount mismatch");
  }
  if (providerPayment.currency !== "INR") {
    errors.push("Payment currency mismatch");
  }

  return errors;
}

export async function ensurePaymentCapturable(
  order: IOrder,
  input: VerifyPaymentInput,
  context?: { userId?: string }
): Promise<"already_paid" | "capturable"> {
  if (order.status === "paid") {
    if (order.razorpayPaymentId && order.razorpayPaymentId !== input.paymentId) {
      throw new ConflictError("Order has already been settled with another payment");
    }
    return "already_paid";
  }

  if (order.status !== "pending" && order.status !== "failed") {
    throw new ConflictError("This order can no longer be processed");
  }

  const isValid = verifySignature(input.orderId, input.paymentId, input.signature);
  if (!isValid) {
    await orderRepository.updateStatus(order._id.toString(), "failed", {
      razorpayPaymentId: input.paymentId,
      failureReason: "Invalid payment signature",
    });
    logger.warn("Payment verification failed", {
      orderId: order._id,
      razorpayOrderId: input.orderId,
    });
    audit({
      action: "payment.signature_invalid",
      userId: context?.userId,
      resourceType: "order",
      resourceId: order._id.toString(),
    });
    throw new ValidationError("Payment verification failed", {
      signature: ["Invalid payment signature"],
    });
  }

  const providerErrors = await validateProviderPayment(
    order,
    input.orderId,
    input.paymentId
  );
  if (providerErrors.length > 0) {
    await orderRepository.updateStatus(order._id.toString(), "failed", {
      razorpayPaymentId: input.paymentId,
      failureReason: providerErrors.join("; "),
    });
    throw new ValidationError("Payment verification failed", {
      payment: providerErrors,
    });
  }

  return "capturable";
}

export async function markPendingOrderFailed(input: {
  razorpayOrderId: string;
  reason: string;
  owner: PaymentOwner;
}): Promise<void> {
  const order = await orderRepository.findByRazorpayOrderId(input.razorpayOrderId);
  if (!order) return;
  if (order.status !== "pending") return;

  try {
    assertOrderOwner(order, input.owner);
  } catch {
    return;
  }

  await orderRepository.updateStatus(order._id.toString(), "failed", {
    failureReason: input.reason,
  });

  logger.info("Order marked as failed", {
    orderId: order._id,
    reason: input.reason,
  });
  audit({
    action: "payment.failed",
    userId: input.owner.kind === "buyer" ? input.owner.buyerId : undefined,
    resourceType: "order",
    resourceId: order._id.toString(),
    metadata: {
      reason: input.reason,
      ...(input.owner.kind === "guest"
        ? { guestEmail: normalizeGuestEmail(input.owner.guestEmail) }
        : {}),
    },
  });
}
