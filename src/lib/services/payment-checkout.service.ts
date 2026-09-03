import { orderRepository } from "@/lib/repositories/order.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { packRepository } from "@/lib/repositories/pack.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { cartService } from "@/lib/services/cart.service";
import { couponService } from "@/lib/services/coupon.service";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { assertBeatPurchasable, assertLicenseValid } from "@/lib/services/purchase-guards";
import { findActiveTier } from "@/lib/utils/pack-helpers";
import {
  generateReceipt,
  placeRazorpayOrder,
} from "@/lib/services/payment-shared";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import type {
  CreateOrderInput,
  CreatePackOrderInput,
  CheckoutCartInput,
  PaymentCreateRequest,
  CreateGuestOrderInput,
} from "@/lib/validators/payment";
import {
  trackCheckoutStart,
  withAttribution,
} from "@/lib/services/payment-attribution";
import type { CreatedCheckoutOrder } from "@/lib/serializers/order";
import type { IOrder, IOrderItem, IOrderAttribution } from "@/types";

function chargedTotal(subtotal: number, discount: number): number {
  return Math.max(1, subtotal - discount);
}

async function resolvePackCoupon(
  couponCode: string | undefined,
  buyerId: string,
  packTargets: Array<{ packId: string; price: number }>
): Promise<{
  couponCode?: string;
  couponId?: IOrder["couponId"];
  discountAmount: number;
  discountPerPack?: Record<string, number>;
}> {
  if (!couponCode || packTargets.length === 0) {
    return { discountAmount: 0 };
  }

  const buyer = await userRepository.findById(buyerId);
  const packIds = packTargets.map((pack) => pack.packId);
  const packPrices = Object.fromEntries(packTargets.map((pack) => [pack.packId, pack.price]));
  const validation = await couponService.validateCoupon(
    couponCode,
    buyerId,
    buyer?.email ?? "",
    packIds,
    packPrices
  );

  return {
    couponCode: validation.coupon.code,
    couponId: validation.coupon._id,
    discountAmount: validation.totalDiscount,
    discountPerPack: validation.discountPerPack,
  };
}

function isCartCheckout(input: PaymentCreateRequest): input is CheckoutCartInput {
  return "fromCart" in input;
}

function isPackCheckout(input: PaymentCreateRequest): input is CreatePackOrderInput {
  return "packId" in input;
}

export const paymentCheckoutService = {
  async createCheckoutOrder(
    input: PaymentCreateRequest,
    buyerId: string,
    attribution?: IOrderAttribution
  ): Promise<CreatedCheckoutOrder> {
    if (isCartCheckout(input)) {
      return this.checkoutCart(input, buyerId, attribution);
    }
    if (isPackCheckout(input)) {
      return this.createPackOrder(input, buyerId, attribution);
    }
    return this.createOrder(input, buyerId, attribution);
  },

  async createOrder(
    input: CreateOrderInput,
    buyerId: string,
    attribution?: IOrderAttribution
  ): Promise<CreatedCheckoutOrder> {
    const already = await purchaseRepository.hasPurchased(buyerId, input.beatId);
    if (already) {
      throw new ConflictError("You have already purchased this beat");
    }

    const existingPendingOrder = await orderRepository.findPendingByBuyerAndBeat(
      buyerId,
      input.beatId
    );
    if (existingPendingOrder?.razorpayOrderId) {
      return {
        orderId: existingPendingOrder.razorpayOrderId,
        amount: existingPendingOrder.totalAmount,
        currency: "INR",
        internalOrderId: existingPendingOrder._id.toString(),
      };
    }

    const license = await licenseRepository.findById(input.licenseId);
    assertLicenseValid(license, input.beatId);

    const beat = await beatRepository.findById(input.beatId);
    assertBeatPurchasable(beat, undefined, {
      accessToken: input.accessToken,
    });

    const receipt = generateReceipt();
    const order = await orderRepository.create(withAttribution({
      buyerId: buyerId as unknown as IOrder["buyerId"],
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
    }, attribution));
    trackCheckoutStart(order, attribution);

    const placed = await placeRazorpayOrder(order, { buyerId });

    logger.info("Order created", {
      orderId: order._id,
      razorpayOrderId: placed.orderId,
      amount: license.price,
    });
    audit({
      action: "payment.order_created",
      userId: buyerId,
      resourceType: "order",
      resourceId: order._id.toString(),
      metadata: { amount: license.price, beatId: input.beatId },
    });

    return placed;
  },

  async createPackOrder(
    input: CreatePackOrderInput,
    buyerId: string,
    attribution?: IOrderAttribution
  ): Promise<CreatedCheckoutOrder> {
    const { packId, packTier, couponCode } = input;
    const already = await purchaseRepository.hasPackPurchase(buyerId, packId);
    if (already) {
      throw new ConflictError("You have already purchased this pack");
    }

    const pack = await packRepository.findById(packId);
    if (!pack) throw new NotFoundError("Beat Pack");
    if (!pack.isPublished || pack.status !== "published") {
      throw new ConflictError("This pack is not available for purchase");
    }

    const tier = findActiveTier(pack, packTier);
    if (!tier) throw new ConflictError("This tier is not available");

    const coupon = await resolvePackCoupon(couponCode, buyerId, [
      { packId, price: tier.price },
    ]);
    const subtotalAmount = tier.price;
    const totalAmount = chargedTotal(subtotalAmount, coupon.discountAmount);
    const receipt = generateReceipt();

    const order = await orderRepository.create(withAttribution({
      buyerId: buyerId as unknown as IOrder["buyerId"],
      items: [
        {
          packId: packId as unknown as IOrderItem["packId"],
          packTier,
          packTitle: pack.title,
          price: tier.price,
        },
      ],
      totalAmount,
      subtotalAmount,
      discountAmount: coupon.discountAmount,
      couponCode: coupon.couponCode,
      couponId: coupon.couponId,
      discountPerPack: coupon.discountPerPack,
      status: "pending",
      receipt,
    }, attribution));
    trackCheckoutStart(order, attribution);

    const placed = await placeRazorpayOrder(order, { buyerId, packId });

    logger.info("Pack order created", {
      orderId: order._id,
      razorpayOrderId: placed.orderId,
      amount: totalAmount,
      packId,
      packTier,
    });
    audit({
      action: "payment.order_created",
      userId: buyerId,
      resourceType: "order",
      resourceId: order._id.toString(),
      metadata: { amount: totalAmount, packId, packTier, couponCode: coupon.couponCode },
    });

    return placed;
  },

  async checkoutCart(
    input: CheckoutCartInput,
    buyerId: string,
    attribution?: IOrderAttribution
  ): Promise<CreatedCheckoutOrder> {
    const [cartItems, packItems] = await Promise.all([
      cartService.getItems(buyerId),
      cartService.getPackItems(buyerId),
    ]);

    if (cartItems.length === 0 && packItems.length === 0) {
      throw new ConflictError("Your cart is empty");
    }

    if (cartItems.length > 0) {
      const beatIds = cartItems.map((item) => item.beatId);
      const ownedBeatIds = new Set(
        await purchaseRepository.getPurchasedBeatIdsForBeats(buyerId, beatIds)
      );
      for (const item of cartItems) {
        if (ownedBeatIds.has(item.beatId)) {
          throw new ConflictError(
            `You already own "${item.beatTitle}". Remove it from your cart.`
          );
        }
      }
    }

    if (packItems.length > 0) {
      const packIds = packItems.map((item) => item.packId);
      const ownedPackIds = new Set(
        await purchaseRepository.getPurchasedPackIdsForPacks(buyerId, packIds)
      );
      for (const item of packItems) {
        if (ownedPackIds.has(item.packId)) {
          throw new ConflictError(
            `You already own "${item.packTitle}". Remove it from your cart or use the upgrade option.`
          );
        }
      }
    }

    const beatOrderItems: IOrderItem[] = cartItems.map((item) => ({
      beatId: item.beatId as unknown as IOrderItem["beatId"],
      licenseId: item.licenseId as unknown as IOrderItem["licenseId"],
      licenseType: item.licenseType,
      price: item.price,
      beatTitle: item.beatTitle,
    }));

    const packOrderItems: IOrderItem[] = packItems.map((item) => ({
      packId: item.packId as unknown as IOrderItem["packId"],
      packTier: item.packTier,
      packTitle: item.packTitle,
      price: item.price,
    }));

    const orderItems = [...beatOrderItems, ...packOrderItems];
    const subtotalAmount = orderItems.reduce((sum, item) => sum + item.price, 0);
    const coupon = await resolvePackCoupon(
      input.couponCode,
      buyerId,
      packItems.map((item) => ({ packId: item.packId, price: item.price }))
    );
    const totalAmount = chargedTotal(subtotalAmount, coupon.discountAmount);
    const receipt = generateReceipt();

    const order = await orderRepository.create(withAttribution({
      buyerId: buyerId as unknown as IOrder["buyerId"],
      items: orderItems,
      totalAmount,
      subtotalAmount,
      discountAmount: coupon.discountAmount,
      couponCode: coupon.couponCode,
      couponId: coupon.couponId,
      discountPerPack: coupon.discountPerPack,
      status: "pending",
      receipt,
    }, attribution));
    trackCheckoutStart(order, attribution);

    const placed = await placeRazorpayOrder(order, {
      buyerId,
      itemCount: String(orderItems.length),
    });

    logger.info("Cart checkout order created", {
      orderId: order._id,
      razorpayOrderId: placed.orderId,
      beats: cartItems.length,
      packs: packItems.length,
      totalAmount,
    });
    audit({
      action: "cart.checkout",
      userId: buyerId,
      resourceType: "order",
      resourceId: order._id.toString(),
      metadata: {
        beats: cartItems.length,
        packs: packItems.length,
        totalAmount,
        couponCode: coupon.couponCode,
      },
    });

    return placed;
  },

  async createGuestOrder(input: CreateGuestOrderInput, attribution?: IOrderAttribution) {
    const { guestPaymentService } = await import("@/lib/services/guest-payment.service");
    return guestPaymentService.createGuestOrder(input, attribution);
  },
};
