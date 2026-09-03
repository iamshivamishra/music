import { orderRepository } from "@/lib/repositories/order.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { offerService } from "@/lib/services/offer.service";
import { ConflictError } from "@/lib/errors";
import {
  generateReceipt,
  placeRazorpayOrder,
} from "@/lib/services/payment-shared";
import {
  trackCheckoutStart,
  withAttribution,
} from "@/lib/services/payment-attribution";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import type { OfferCheckoutInput } from "@/lib/validators/offer";
import type { CreatedCheckoutOrder } from "@/lib/serializers/order";
import type { IOrder, IOrderItem, IOrderAttribution } from "@/types";

const OFFER_CHECKOUT_LOCK_MS = 15 * 60 * 1000;

function sameOfferCheckoutActor(
  pending: IOrder,
  actor: { buyerId?: string; guestEmail?: string }
): boolean {
  if (actor.buyerId && pending.buyerId?.toString() === actor.buyerId) return true;
  if (actor.guestEmail && pending.guestEmail === actor.guestEmail) return true;
  return false;
}

export const offerCheckoutService = {
  async createOfferOrder(
    input: OfferCheckoutInput,
    actor: { buyerId?: string; guestEmail?: string; guestName?: string },
    attribution?: IOrderAttribution
  ): Promise<CreatedCheckoutOrder> {
    if (!actor.buyerId && !actor.guestEmail) {
      throw new ConflictError("Sign in or provide an email to check out");
    }

    const { offer, beat } = await offerService.requireOpenOffer(input.token);
    const offerId = offer._id.toString();
    const beatId = beat._id.toString();
    const amount = offer.amount;

    if (actor.buyerId) {
      const already = await purchaseRepository.hasPurchased(actor.buyerId, beatId);
      if (already) {
        throw new ConflictError("You have already purchased this beat");
      }
    }

    const existingPending = await orderRepository.findPendingByOfferId(offerId);
    if (existingPending?.razorpayOrderId) {
      if (sameOfferCheckoutActor(existingPending, actor)) {
        return {
          orderId: existingPending.razorpayOrderId,
          amount: existingPending.totalAmount,
          currency: "INR",
          internalOrderId: existingPending._id.toString(),
        };
      }
      const ageMs = Date.now() - new Date(existingPending.createdAt).getTime();
      if (ageMs < OFFER_CHECKOUT_LOCK_MS) {
        throw new ConflictError("This offer is already being checked out");
      }
    }

    const receipt = generateReceipt();
    const order = await orderRepository.create(
      withAttribution(
        {
          buyerId: actor.buyerId as unknown as IOrder["buyerId"],
          guestEmail: actor.guestEmail,
          guestName: actor.guestName,
          offerId: offerId as unknown as IOrder["offerId"],
          items: [
            {
              beatId: beatId as unknown as IOrderItem["beatId"],
              licenseType: offer.licenseType,
              price: amount,
              beatTitle: beat.title,
            },
          ],
          totalAmount: amount,
          subtotalAmount: amount,
          discountAmount: 0,
          status: "pending",
          receipt,
        },
        attribution
      )
    );
    trackCheckoutStart(order, attribution);

    const placed = await placeRazorpayOrder(order, {
      ...(actor.buyerId ? { buyerId: actor.buyerId } : {}),
      ...(actor.guestEmail ? { guestEmail: actor.guestEmail } : {}),
      offerId,
      beatId,
    });

    logger.info("Offer order created", {
      orderId: order._id,
      razorpayOrderId: placed.orderId,
      amount,
      offerId,
      guestEmail: actor.guestEmail,
    });
    audit({
      action: "payment.order_created",
      userId: actor.buyerId,
      resourceType: "order",
      resourceId: order._id.toString(),
      metadata: { amount, offerId, beatId, guestEmail: actor.guestEmail },
    });

    return placed;
  },
};
