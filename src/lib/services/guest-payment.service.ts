import { orderRepository } from "@/lib/repositories/order.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { orderFulfillmentService } from "@/lib/services/order-fulfillment";
import { downloadService } from "@/lib/services/download.service";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { assertBeatPurchasable, assertLicenseValid } from "@/lib/services/purchase-guards";
import {
  generateReceipt,
  normalizeGuestEmail,
  assertOrderOwner,
  ensurePaymentCapturable,
  markPendingOrderFailed,
  placeRazorpayOrder,
} from "@/lib/services/payment-shared";
import {
  trackCheckoutStart,
  withAttribution,
} from "@/lib/services/payment-attribution";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import type { CreateGuestOrderInput, VerifyPaymentInput } from "@/lib/validators/payment";
import type { CreatedCheckoutOrder } from "@/lib/serializers/order";
import {
  toGuestDownloadDto,
  type GuestDownloadDto,
} from "@/lib/serializers/download";
import type { IOrder, IPurchase, IOrderItem, IOrderAttribution } from "@/types";

export type DownloadTokenState =
  | { status: "valid"; order: IOrder }
  | { status: "expired"; order: IOrder }
  | { status: "invalid"; order?: undefined };

export type GuestDownloadResult =
  | { status: "invalid" }
  | { status: "expired"; guestEmail?: string }
  | { status: "valid"; download: GuestDownloadDto };

export const guestPaymentService = {
  async createGuestOrder(
    input: CreateGuestOrderInput,
    attribution?: IOrderAttribution
  ): Promise<CreatedCheckoutOrder> {
    const guestEmail = normalizeGuestEmail(input.guestEmail);

    const existingPurchase = await purchaseRepository.findPaidByGuestEmailAndBeat(
      guestEmail,
      input.beatId
    );
    if (existingPurchase) {
      throw new ConflictError(
        "You already own this beat. Check your email for the download link."
      );
    }

    const existingPending = await orderRepository.findPendingByGuestEmailAndBeat(
      guestEmail,
      input.beatId
    );
    if (existingPending?.razorpayOrderId) {
      return {
        orderId: existingPending.razorpayOrderId,
        amount: existingPending.totalAmount,
        currency: "INR",
        internalOrderId: existingPending._id.toString(),
      };
    }

    const license = await licenseRepository.findById(input.licenseId);
    assertLicenseValid(license, input.beatId);

    const beat = await beatRepository.findById(input.beatId);
    assertBeatPurchasable(beat, undefined, {
      accessToken: input.accessToken,
    });

    const receipt = generateReceipt();
    const order = await orderRepository.create(
      withAttribution(
        {
          guestEmail,
          guestName: input.guestName,
          items: [
            {
              beatId: input.beatId as unknown as IOrderItem["beatId"],
              licenseId: input.licenseId as unknown as IOrderItem["licenseId"],
              licenseType: license.type,
              price: license.price,
              beatTitle: beat.title,
            },
          ],
          totalAmount: license.price,
          subtotalAmount: license.price,
          discountAmount: 0,
          status: "pending",
          receipt,
        },
        attribution
      )
    );
    trackCheckoutStart(order, attribution);

    const placed = await placeRazorpayOrder(order, {
      guestEmail,
      guestName: input.guestName || "",
    });

    logger.info("Guest order created", {
      orderId: order._id,
      razorpayOrderId: placed.orderId,
      amount: license.price,
      guestEmail,
    });
    audit({
      action: "payment.order_created",
      resourceType: "order",
      resourceId: order._id.toString(),
      metadata: { amount: license.price, beatId: input.beatId, guestEmail },
    });

    return placed;
  },

  async verifyGuestPayment(
    input: VerifyPaymentInput,
    guestEmail: string
  ): Promise<{ order: IOrder; purchases: IPurchase[]; downloadToken: string }> {
    const order = await orderRepository.findByRazorpayOrderId(input.orderId);
    if (!order) throw new NotFoundError("Order");

    const normalizedEmail = normalizeGuestEmail(guestEmail);
    assertOrderOwner(order, { kind: "guest", guestEmail: normalizedEmail });

    const captureState = await ensurePaymentCapturable(order, input);
    if (captureState === "already_paid") {
      const purchases = await purchaseRepository.findByOrderId(input.orderId);
      return { order, purchases, downloadToken: order.downloadToken || "" };
    }

    const result = await orderFulfillmentService.fulfillGuestOrder(
      order,
      input.paymentId,
      input.signature
    );
    const downloadToken = result.downloadToken || "";

    logger.info("Guest payment verified and recorded", {
      orderId: order._id,
      purchaseCount: result.purchases.length,
      totalAmount: result.paidOrder.totalAmount,
      guestEmail: normalizedEmail,
    });
    audit({
      action: "payment.verified",
      resourceType: "order",
      resourceId: result.paidOrder._id.toString(),
      metadata: {
        purchaseCount: result.purchases.length,
        totalAmount: result.paidOrder.totalAmount,
        guestEmail: normalizedEmail,
      },
    });

    const updatedOrder = await orderRepository.findById(result.paidOrder._id.toString());
    if (!updatedOrder) throw new NotFoundError("Order");

    return { order: updatedOrder, purchases: result.purchases, downloadToken };
  },

  async getDownloadTokenState(token: string): Promise<DownloadTokenState> {
    const order = await orderRepository.findByDownloadTokenAny(token);
    if (!order || order.status !== "paid") {
      return { status: "invalid" };
    }

    const expiry = order.downloadTokenExpiry
      ? new Date(order.downloadTokenExpiry)
      : null;
    if (!expiry || expiry.getTime() <= Date.now()) {
      return { status: "expired", order };
    }

    return { status: "valid", order };
  },

  async getGuestDownload(token: string): Promise<GuestDownloadResult> {
    const state = await this.getDownloadTokenState(token);
    if (state.status === "invalid") return { status: "invalid" };
    if (state.status === "expired") {
      return { status: "expired", guestEmail: state.order.guestEmail };
    }

    const items = await downloadService.getGuestDownloadLinks(
      state.order.razorpayOrderId ?? ""
    );
    return {
      status: "valid",
      download: toGuestDownloadDto(state.order, items),
    };
  },

  async markFailed(
    razorpayOrderId: string,
    guestEmail: string,
    reason: string
  ): Promise<void> {
    await markPendingOrderFailed({
      razorpayOrderId,
      reason,
      owner: { kind: "guest", guestEmail },
    });
  },
};
