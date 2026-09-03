import { randomBytes } from "crypto";
import { orderRepository } from "@/lib/repositories/order.repository";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { packRepository } from "@/lib/repositories/pack.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { cartRepository } from "@/lib/repositories/cart.repository";
import { couponService } from "@/lib/services/coupon.service";
import { pdfService } from "@/lib/services/pdf.service";
import { purchaseEmailService } from "@/lib/services/purchase-email.service";
import { offerService } from "@/lib/services/offer.service";
import { whatsappService } from "@/lib/services/whatsapp.service";
import type { SaleNotificationPayload } from "@/lib/services/whatsapp.service";
import { earningRepository } from "@/lib/repositories/earning.repository";
import { resolveActiveShares, splitAmountInPaise } from "@/lib/services/earning-split";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { withTransaction } from "@/lib/db";
import { ConflictError, NotFoundError } from "@/lib/errors";
import { findActiveTier } from "@/lib/utils/pack-helpers";
import { assertBeatFulfillable } from "@/lib/services/purchase-guards";
import { logger } from "@/lib/logger";
import { audit } from "@/lib/audit";
import type { ClientSession } from "mongoose";
import type { IBeat, IBeatPack, IOrder, IPurchase, IOrderItem } from "@/types";

interface MongoLikeError {
  code?: number;
}

export interface FulfillResult {
  paidOrder: IOrder;
  purchases: IPurchase[];
  createdCount: number;
  reusedCount: number;
  newlyPaid: boolean;
  downloadToken?: string;
}

async function persistLicenseIdentifiers(purchases: IPurchase[]): Promise<void> {
  await Promise.allSettled(
    purchases.map((p) => pdfService.persistLicenseIdentifiers(p._id.toString()))
  );
}

async function sendWhatsAppSaleAlerts(
  order: IOrder,
  purchases: IPurchase[]
): Promise<void> {
  const orderId = order.razorpayOrderId ?? order._id.toString();

  // Group purchases by producerId to send one WhatsApp per producer
  const groups = new Map<
    string,
    { beatTitle: string; licenseName: string; grossAmount: number }
  >();

  for (const p of purchases) {
    const producerId = p.producerId?.toString();
    if (!producerId) continue;

    const existing = groups.get(producerId);
    if (existing) {
      existing.grossAmount += p.amount;
    } else {
      // Find the matching order item for title/license info
      const orderItem = order.items.find((item) => {
        if (p.packId && item.packId) {
          return item.packId.toString() === p.packId.toString();
        }
        if (p.beatId && item.beatId) {
          return item.beatId.toString() === p.beatId.toString();
        }
        return false;
      });

      const beatTitle =
        orderItem?.beatTitle ?? orderItem?.packTitle ?? "Your beat";
      const licenseName = p.packTier
        ? `${p.packTier} Pack`
        : p.licenseType ?? "License";

      groups.set(producerId, { beatTitle, licenseName, grossAmount: p.amount });
    }
  }

  const promises: Promise<void>[] = [];

  for (const [producerId, info] of groups) {
    const payload: SaleNotificationPayload = {
      orderId,
      beatTitle: info.beatTitle,
      licenseName: info.licenseName,
      grossAmount: info.grossAmount,
    };
    promises.push(whatsappService.notifySale(producerId, payload));
  }

  await Promise.allSettled(promises);
}

async function notifyAfterFulfillment(
  result: FulfillResult,
  buyerEmail: string,
  buyerName: string,
  guestDownloadToken?: string
): Promise<void> {
  await persistLicenseIdentifiers(result.purchases);
  await Promise.allSettled([
    purchaseEmailService.notifyOrderFulfilled({
      order: result.paidOrder,
      purchases: result.purchases,
      buyerEmail,
      buyerName,
      guestDownloadToken,
    }),
    sendWhatsAppSaleAlerts(result.paidOrder, result.purchases),
  ]);
}

async function runLoggedInPostPaymentHooks(
  buyerId: string,
  result: FulfillResult
): Promise<void> {
  const buyer = await userRepository.findById(buyerId);
  if (!buyer) {
    logger.warn("Post-payment email skipped: buyer not found", { buyerId });
    await persistLicenseIdentifiers(result.purchases);
    return;
  }

  await notifyAfterFulfillment(
    result,
    buyer.email,
    buyer.displayName || buyer.name
  );
}

async function issueGuestDownloadToken(orderId: string): Promise<string> {
  const downloadToken = randomBytes(32).toString("hex");
  const downloadTokenExpiry = new Date(Date.now() + 48 * 60 * 60 * 1000);
  await orderRepository.setDownloadToken(orderId, downloadToken, downloadTokenExpiry);
  return downloadToken;
}

async function creditPurchaseEarnings(
  purchase: IPurchase,
  mongoOrderId: string,
  session: ClientSession,
  catalog: { beat?: IBeat | null; pack?: IBeatPack | null } = {}
): Promise<void> {
  let beat = catalog.beat ?? null;
  let pack = catalog.pack ?? null;

  if (!beat && purchase.beatId) {
    beat = await beatRepository.findById(purchase.beatId.toString(), false, { session });
  }
  if (!pack && purchase.packId) {
    pack = await packRepository.findById(purchase.packId.toString(), { session });
  }

  const ownerId = pack
    ? pack.producerId.toString()
    : beat?.producerId.toString();
  if (!ownerId) {
    logger.warn("Skipping earnings: no catalog owner", {
      purchaseId: purchase._id.toString(),
    });
    return;
  }

  const shares =
    !isFeatureEnabled("collabSplits") || pack || !beat
      ? [{ producerId: ownerId, percent: 100, isOwner: true as const }]
      : resolveActiveShares(beat);

  const rows = splitAmountInPaise(purchase.amount, shares);
  await earningRepository.insertShares(
    rows.map((row) => ({
      purchaseId: purchase._id.toString(),
      orderId: mongoOrderId,
      beatId: purchase.beatId?.toString(),
      packId: purchase.packId?.toString(),
      producerId: row.producerId,
      grossAmount: row.grossAmount,
      sharePercent: row.sharePercent,
    })),
    { session }
  );
}

async function recordCouponUsageInTxn(
  paidOrder: IOrder,
  buyerId: string,
  razorpayOrderId: string,
  session: ClientSession
): Promise<void> {
  if (!paidOrder.couponId || !paidOrder.discountAmount || paidOrder.discountAmount <= 0) {
    return;
  }

  const packIds = paidOrder.items
    .filter((item) => item.packId)
    .map((item) => item.packId!.toString());

  await couponService.recordUsage(
    paidOrder.couponId.toString(),
    buyerId,
    paidOrder.razorpayOrderId ?? razorpayOrderId,
    packIds,
    paidOrder.discountPerPack ?? {},
    { session }
  );
}

async function fulfillPackItem(
  item: IOrderItem,
  buyerId: string,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  orderId: string,
  session: ClientSession
): Promise<{ purchase: IPurchase; created: boolean }> {
  const packId = item.packId!.toString();
  const pack = await packRepository.findById(packId, { session });
  if (!pack) throw new NotFoundError("Beat Pack");

  const tier = findActiveTier(pack, item.packTier!);
  if (!tier) throw new ConflictError("Pack tier is no longer available");

  try {
    const purchase = await purchaseRepository.create(
      {
        buyerId: buyerId as unknown as IPurchase["buyerId"],
        packId: item.packId as unknown as IPurchase["packId"],
        packTier: item.packTier,
        sourceType: "pack",
        includesWav: tier.includesWav,
        includesStems: tier.includesStems,
        producerId: pack.producerId as unknown as IPurchase["producerId"],
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        amount: item.price,
      },
      { session }
    );

    await packRepository.incrementSalesCount(packId, { session });
    await userRepository.incrementSalesCount(pack.producerId.toString(), { session });
    audit({
      action: "pack.purchase",
      userId: buyerId,
      resourceType: "pack",
      resourceId: packId,
      metadata: { packTier: item.packTier, amount: item.price, orderId },
    });

    return { purchase, created: true };
  } catch (error) {
    const mongoError = error as MongoLikeError;
    if (mongoError.code !== 11000) throw error;
    const existing = await purchaseRepository.findPackPurchase(buyerId, packId, { session });
    if (existing) return { purchase: existing, created: false };
    throw error;
  }
}

async function applyExclusiveUnlist(
  beatId: string,
  buyerId: string | undefined,
  amount: number,
  orderId: string,
  session: ClientSession
): Promise<void> {
  const exclusiveFields: Partial<IBeat> = {
    status: "archived" as IBeat["status"],
    isPublished: false,
    exclusiveSoldAt: new Date(),
    ...(buyerId ? { exclusiveBuyerId: buyerId as unknown as IBeat["exclusiveBuyerId"] } : {}),
  };
  await beatRepository.markExclusive(beatId, exclusiveFields, { session });
  await licenseRepository.deactivateAllForBeat(beatId, { session });
  audit({
    action: "beat.exclusive_sold",
    userId: buyerId,
    resourceType: "beat",
    resourceId: beatId,
    metadata: { amount, orderId },
  });
}

async function fulfillOfferBeatItem(
  order: IOrder,
  item: IOrderItem,
  buyer: { buyerId?: string; guestEmail?: string },
  razorpayOrderId: string,
  razorpayPaymentId: string,
  session: ClientSession
): Promise<{ purchase: IPurchase; created: boolean } | null> {
  const offerId = order.offerId?.toString();
  if (!offerId || !item.beatId) return null;

  const beatId = item.beatId.toString();
  const { licenseType, snapshot } = await offerService.acceptForOrder(
    offerId,
    order._id.toString(),
    { buyerId: buyer.buyerId },
    { session }
  );

  const beat = await beatRepository.findById(beatId, false, { session });
  assertBeatFulfillable(beat);
  if (beat.exclusiveBuyerId) {
    throw new ConflictError("This beat is no longer available (sold exclusively)");
  }

  try {
    const purchase = await purchaseRepository.create(
      {
        buyerId: buyer.buyerId as unknown as IPurchase["buyerId"],
        guestEmail: buyer.guestEmail,
        beatId: item.beatId as unknown as IPurchase["beatId"],
        licenseType,
        includesWav: snapshot.includesWav,
        includesStems: snapshot.includesStems,
        licenseSnapshot: snapshot,
        producerId: beat.producerId as unknown as IPurchase["producerId"],
        offerId: offerId as unknown as IPurchase["offerId"],
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        amount: item.price,
      },
      { session }
    );

    await offerService.attachAcceptedPurchase(offerId, purchase._id.toString(), { session });
    await beatRepository.incrementSalesCount(beatId, { session });
    await userRepository.incrementSalesCount(beat.producerId.toString(), { session });

    audit({
      action: "purchase.created",
      userId: buyer.buyerId,
      resourceType: "beat",
      resourceId: beatId,
      metadata: {
        licenseType,
        amount: item.price,
        orderId: order._id.toString(),
        offerId,
      },
    });

    if (licenseType === "exclusive") {
      await applyExclusiveUnlist(beatId, buyer.buyerId, item.price, order._id.toString(), session);
    }

    return { purchase, created: true };
  } catch (error) {
    const mongoError = error as MongoLikeError;
    if (mongoError.code !== 11000) throw error;
    if (buyer.buyerId) {
      const existingPurchases = await purchaseRepository.findByBuyerAndBeat(
        buyer.buyerId,
        beatId,
        { session }
      );
      if (existingPurchases[0]) {
        return { purchase: existingPurchases[0], created: false };
      }
    }
    throw error;
  }
}

async function fulfillBeatItem(
  item: IOrderItem,
  buyerId: string | undefined,
  guestEmail: string | undefined,
  razorpayOrderId: string,
  razorpayPaymentId: string,
  order: IOrder,
  session: ClientSession
): Promise<{ purchase: IPurchase; created: boolean } | null> {
  if (order.offerId) {
    return fulfillOfferBeatItem(
      order,
      item,
      { buyerId, guestEmail },
      razorpayOrderId,
      razorpayPaymentId,
      session
    );
  }

  const beatId = item.beatId!.toString();
  const licenseId = item.licenseId?.toString();
  if (!licenseId) {
    logger.warn("Beat order item missing licenseId", { orderId: order._id, beatId });
    return null;
  }

  const [beat, license] = await Promise.all([
    beatRepository.findById(beatId, false, { session }),
    licenseRepository.findById(licenseId, { session }),
  ]);

  if (!beat) throw new NotFoundError("Beat");
  assertBeatFulfillable(beat);
  if (!license || !license.isActive) {
    throw new ConflictError("License is no longer available");
  }
  if (license.beatId.toString() !== beatId) {
    throw new ConflictError("License does not belong to this beat");
  }

  try {
    const purchase = await purchaseRepository.create(
      {
        buyerId: buyerId as unknown as IPurchase["buyerId"],
        guestEmail,
        beatId: item.beatId as unknown as IPurchase["beatId"],
        licenseId: item.licenseId as unknown as IPurchase["licenseId"],
        licenseType: item.licenseType,
        includesWav: license.includesWav,
        includesStems: license.includesStems,
        producerId: beat.producerId as unknown as IPurchase["producerId"],
        orderId: razorpayOrderId,
        paymentId: razorpayPaymentId,
        amount: item.price,
      },
      { session }
    );

    await beatRepository.incrementSalesCount(beatId, { session });
    await userRepository.incrementSalesCount(beat.producerId.toString(), { session });

    audit({
      action: "purchase.created",
      userId: buyerId,
      resourceType: "beat",
      resourceId: beatId,
      metadata: { licenseType: item.licenseType, amount: item.price, orderId: order._id.toString() },
    });

    if (item.licenseType === "exclusive") {
      await applyExclusiveUnlist(beatId, buyerId, item.price, order._id.toString(), session);
    }

    return { purchase, created: true };
  } catch (error) {
    const mongoError = error as MongoLikeError;
    if (mongoError.code !== 11000) throw error;
    if (buyerId) {
      const existingPurchases = await purchaseRepository.findByBuyerAndBeat(
        buyerId,
        beatId,
        { session }
      );
      if (existingPurchases[0]) {
        return { purchase: existingPurchases[0], created: false };
      }
    }
    throw error;
  }
}

async function fulfillOrder(
  order: IOrder,
  razorpayPaymentId: string,
  razorpaySignature?: string
): Promise<FulfillResult> {
  const buyerId = order.buyerId!.toString();
  const razorpayOrderId = order.razorpayOrderId ?? "";

  const result = await withTransaction(async (session): Promise<FulfillResult> => {
    const paidOrder = await orderRepository.markPaidIfPending(
      order._id.toString(),
      {
        razorpayPaymentId,
        ...(razorpaySignature ? { razorpaySignature } : {}),
        paidAt: new Date(),
      },
      { session }
    );

    if (!paidOrder) {
      const latest = await orderRepository.findById(order._id.toString(), { session });
      if (latest?.status === "paid") {
        const isServiceOrder = latest.items.some(
          (item) => item.kind === "service_deposit" || item.kind === "service_balance"
        );
        if (isServiceOrder) {
          return {
            paidOrder: latest,
            purchases: [],
            createdCount: 0,
            reusedCount: 0,
            newlyPaid: false,
          };
        }
        const purchases = await purchaseRepository.findByBuyerAndOrderId(
          buyerId,
          razorpayOrderId,
          { session }
        );
        await Promise.all(
          purchases.map((purchase) =>
            creditPurchaseEarnings(purchase, order._id.toString(), session)
          )
        );
        return {
          paidOrder: latest,
          purchases,
          createdCount: 0,
          reusedCount: purchases.length,
          newlyPaid: false,
        };
      }
      throw new ConflictError("This order has already been processed");
    }

    const purchases: IPurchase[] = [];
    let createdCount = 0;
    let reusedCount = 0;

    const isServiceOrder = paidOrder.items.some(
      (item) => item.kind === "service_deposit" || item.kind === "service_balance"
    );
    if (isServiceOrder) {
      const { serviceJobService } = await import("@/lib/services/service-job.service");
      await serviceJobService.onPaymentCaptured(paidOrder, session);
      return { paidOrder, purchases, createdCount: 0, reusedCount: 0, newlyPaid: true };
    }

    for (const item of paidOrder.items) {
      const isBeatItem = !!item.beatId;
      const isPackItem = !!item.packId;

      if (!isBeatItem && !isPackItem) {
        logger.warn("Skipping malformed order item with no beatId or packId", {
          orderId: order._id,
        });
        continue;
      }

      const outcome = isPackItem
        ? await fulfillPackItem(
            item,
            buyerId,
            razorpayOrderId,
            razorpayPaymentId,
            order._id.toString(),
            session
          )
        : await fulfillBeatItem(
            item,
            buyerId,
            undefined,
            razorpayOrderId,
            razorpayPaymentId,
            paidOrder,
            session
          );

      if (!outcome) continue;
      purchases.push(outcome.purchase);
      if (outcome.created) createdCount += 1;
      else reusedCount += 1;
    }

    if (purchases.length === 0) {
      throw new ConflictError("Payment captured but purchase creation failed");
    }

    await Promise.all(
      purchases.map((purchase) =>
        creditPurchaseEarnings(purchase, order._id.toString(), session)
      )
    );

    await cartRepository.clear(buyerId, { session });
    await recordCouponUsageInTxn(paidOrder, buyerId, razorpayOrderId, session);

    return { paidOrder, purchases, createdCount, reusedCount, newlyPaid: true };
  });

  if (result.newlyPaid && result.purchases.length > 0) {
    runLoggedInPostPaymentHooks(buyerId, result).catch((error) => {
      logger.error("Post-payment hooks failed — email/PDF may not have been sent", {
        orderId: result.paidOrder._id.toString(),
        userId: buyerId,
        action: "runLoggedInPostPaymentHooks",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    });
  }

  return result;
}

async function fulfillGuestOrder(
  order: IOrder,
  razorpayPaymentId: string,
  razorpaySignature?: string
): Promise<FulfillResult> {
  const guestEmail = order.guestEmail ?? "";
  const razorpayOrderId = order.razorpayOrderId ?? "";

  const result = await withTransaction(async (session): Promise<FulfillResult> => {
    const paidOrder = await orderRepository.markPaidIfPending(
      order._id.toString(),
      {
        razorpayPaymentId,
        ...(razorpaySignature ? { razorpaySignature } : {}),
        paidAt: new Date(),
      },
      { session }
    );

    if (!paidOrder) {
      const latest = await orderRepository.findById(order._id.toString(), { session });
      if (latest?.status === "paid") {
        const purchases = await purchaseRepository.findByOrderId(razorpayOrderId);
        await Promise.all(
          purchases.map((purchase) =>
            creditPurchaseEarnings(purchase, order._id.toString(), session)
          )
        );
        return {
          paidOrder: latest,
          purchases,
          createdCount: 0,
          reusedCount: purchases.length,
          newlyPaid: false,
        };
      }
      throw new ConflictError("This order has already been processed");
    }

    const purchases: IPurchase[] = [];
    let createdCount = 0;
    let reusedCount = 0;

    for (const item of paidOrder.items) {
      if (!item.beatId) {
        logger.warn("Guest order: skipping non-beat item", { orderId: order._id });
        continue;
      }

      const outcome = await fulfillBeatItem(
        item,
        undefined,
        guestEmail,
        razorpayOrderId,
        razorpayPaymentId,
        paidOrder,
        session
      );

      if (!outcome) continue;
      purchases.push(outcome.purchase);
      if (outcome.created) createdCount += 1;
      else reusedCount += 1;
    }

    if (purchases.length === 0 && createdCount === 0) {
      throw new ConflictError("Payment captured but purchase creation failed");
    }

    await Promise.all(
      purchases.map((purchase) =>
        creditPurchaseEarnings(purchase, order._id.toString(), session)
      )
    );

    return { paidOrder, purchases, createdCount, reusedCount, newlyPaid: true };
  });

  if (!result.newlyPaid) return result;

  try {
    result.downloadToken = await issueGuestDownloadToken(order._id.toString());
  } catch (error) {
    logger.warn("Failed to issue guest download token", {
      orderId: order._id,
      error: error instanceof Error ? error.message : String(error),
    });
  }

  if (guestEmail && result.downloadToken) {
    notifyAfterFulfillment(
      result,
      guestEmail,
      order.guestName || "Customer",
      result.downloadToken
    ).catch((error) => {
      logger.error("Guest purchase confirmation failed — email/PDF may not have been sent", {
        orderId: result.paidOrder._id.toString(),
        guestEmail,
        action: "notifyAfterFulfillment",
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
    });
  } else {
    persistLicenseIdentifiers(result.purchases).catch((error) => {
      logger.error("License identifier persistence failed for guest order", {
        orderId: result.paidOrder._id.toString(),
        guestEmail,
        action: "persistLicenseIdentifiers",
        purchaseCount: result.purchases.length,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }

  return result;
}

export const orderFulfillmentService = {
  fulfillOrder,
  fulfillGuestOrder,
};
