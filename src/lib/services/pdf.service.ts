import crypto from "crypto";
import { purchaseRepository } from "@/lib/repositories/purchase.repository";
import { orderRepository } from "@/lib/repositories/order.repository";
import { beatRepository } from "@/lib/repositories/beat.repository";
import { licenseRepository } from "@/lib/repositories/license.repository";
import { packRepository } from "@/lib/repositories/pack.repository";
import { userRepository } from "@/lib/repositories/user.repository";
import { storageAdapter } from "@/lib/storage/adapter";
import { buildLicensePdfKey, buildInvoicePdfKey } from "@/lib/storage/keys";
import { licenseVerifyService } from "@/lib/services/license-verify.service";
import { renderLicensePdf, type LicensePdfInput } from "@/lib/pdf/license-template";
import { renderInvoicePdf } from "@/lib/pdf/invoice-template";
import { computeGstBreakup } from "@/lib/utils/tax";
import { NotFoundError } from "@/lib/errors";
import { findTier } from "@/lib/utils/pack-helpers";
import { logger } from "@/lib/logger";
import type { IPurchase } from "@/types";

const PRESIGN_TTL_SECONDS = 300;
const INVOICE_NUMBER_RETRIES = 3;

function generateVerificationHash(purchaseId: string, orderId: string, paymentId: string): string {
  const payload = `verify:${purchaseId}:${orderId}:${paymentId}`;
  return crypto.createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

/**
 * Assemble the DTO needed by the license PDF renderer.
 * Separated from the service so data-fetching and rendering are decoupled.
 */
async function buildLicensePdfInput(purchase: IPurchase): Promise<LicensePdfInput> {
  const purchaseId = purchase._id.toString();
  if (!purchase.buyerId) throw new NotFoundError("Buyer");
  const buyer = await userRepository.findById(purchase.buyerId.toString());
  if (!buyer) throw new NotFoundError("Buyer");

  let beatTitle = "Unknown Beat";
  let genre = "";
  let bpm: number | undefined;
  let musicalKey: string | undefined;
  let producerName = "Unknown";
  let producerUsername: string | undefined;
  let licenseName = "License";
  let licenseTerms = "";
  let includesWav = purchase.includesWav ?? false;
  let includesStems = purchase.includesStems ?? false;
  let commercialUse = false;
  let streamLimit = 0;
  let licenseType = purchase.licenseType ?? purchase.packTier ?? "basic";
  let beatId = purchase.beatId?.toString() ?? "";

  if (purchase.packId) {
    const pack = await packRepository.findById(purchase.packId.toString());
    if (pack) {
      beatTitle = pack.title;
      genre = pack.genre;
      const producer = await userRepository.findById(pack.producerId.toString());
      producerName = producer?.displayName || producer?.name || "Unknown";
      producerUsername = producer?.username;

      const tier = purchase.packTier ? findTier(pack, purchase.packTier) : undefined;
      if (tier) {
        licenseName = tier.name;
        licenseTerms = tier.terms;
        includesWav = tier.includesWav;
        includesStems = tier.includesStems;
        commercialUse = tier.commercialUse;
        streamLimit = tier.streamLimit;
      }
    }
  } else if (purchase.beatId) {
    beatId = purchase.beatId.toString();
    const [beat, license] = await Promise.all([
      beatRepository.findById(beatId),
      purchase.licenseId ? licenseRepository.findById(purchase.licenseId.toString()) : null,
    ]);

    if (beat) {
      beatTitle = beat.title;
      genre = beat.genre;
      bpm = beat.bpm;
      musicalKey = beat.key;
      const producer = await userRepository.findById(beat.producerId.toString());
      producerName = producer?.displayName || producer?.name || "Unknown";
      producerUsername = producer?.username;
    }

    if (purchase.licenseSnapshot) {
      const snapshot = purchase.licenseSnapshot;
      licenseName = snapshot.name;
      licenseTerms = snapshot.terms;
      includesWav = snapshot.includesWav;
      includesStems = snapshot.includesStems;
      commercialUse = snapshot.commercialUse;
      streamLimit = snapshot.streamLimit;
    } else if (license) {
      licenseName = license.name;
      licenseTerms = license.terms;
      includesWav = license.includesWav;
      includesStems = license.includesStems;
      commercialUse = license.commercialUse;
      streamLimit = license.streamLimit;
      licenseType = license.type;
    }
  }

  const licenseNumber =
    purchase.licenseNumber || licenseVerifyService.generateLicenseNumber(purchaseId);
  const verificationHash =
    purchase.verificationHash ||
    generateVerificationHash(purchaseId, purchase.orderId, purchase.paymentId);

  return {
    purchaseId,
    licenseNumber,
    verificationHash,
    buyerName: buyer.displayName || buyer.name,
    buyerEmail: buyer.email,
    producerName,
    producerUsername,
    beatTitle,
    beatId,
    bpm,
    musicalKey,
    genre,
    licenseType,
    licenseName,
    licenseTerms,
    includesWav,
    includesStems,
    commercialUse,
    streamLimit,
    price: purchase.amount,
    orderId: purchase.orderId,
    paymentId: purchase.paymentId,
    purchaseDate: purchase.createdAt,
  };
}

export const pdfService = {
  async getLicensePdfUrl(purchaseId: string, buyerId: string): Promise<string> {
    const purchase = await purchaseRepository.findByIdAndBuyer(purchaseId, buyerId);
    if (!purchase) throw new NotFoundError("Purchase");

    if (purchase.licensePdfKey) {
      return storageAdapter.presignGet({
        key: purchase.licensePdfKey,
        expiresIn: PRESIGN_TTL_SECONDS,
      });
    }

    const buffer = await this.generateLicensePdf(purchaseId);
    const key = buildLicensePdfKey(purchaseId);

    await storageAdapter.putObject({ key, body: buffer, contentType: "application/pdf" });
    await purchaseRepository.updateLicenseFields(purchaseId, { licensePdfKey: key });

    logger.info("License PDF generated and cached", { purchaseId, key });

    return storageAdapter.presignGet({ key, expiresIn: PRESIGN_TTL_SECONDS });
  },

  async generateLicensePdf(purchaseId: string): Promise<Buffer> {
    const purchase = await purchaseRepository.findById(purchaseId);
    if (!purchase) throw new NotFoundError("Purchase");

    const input = await buildLicensePdfInput(purchase);
    return renderLicensePdf(input);
  },

  async getInvoicePdfUrl(orderId: string, buyerId: string): Promise<string> {
    if (!process.env.PLATFORM_GSTIN) {
      throw new NotFoundError("GST invoices are not available yet");
    }

    const order = await orderRepository.findById(orderId);
    if (!order) throw new NotFoundError("Order");
    if (order.buyerId?.toString() !== buyerId) throw new NotFoundError("Order");
    if (order.status !== "paid") throw new NotFoundError("Order");

    if (order.invoicePdfKey) {
      return storageAdapter.presignGet({
        key: order.invoicePdfKey,
        expiresIn: PRESIGN_TTL_SECONDS,
      });
    }

    const buyer = await userRepository.findById(buyerId);
    if (!buyer) throw new NotFoundError("Buyer");

    const gstBreakup = order.gstBreakup || computeGstBreakup(order.totalAmount);

    // Retry loop handles the rare case where two concurrent requests
    // generate the same sequential invoice number (unique index rejects the duplicate).
    let invoiceNumber = order.invoiceNumber || "";
    let key = buildInvoicePdfKey(orderId);
    for (let attempt = 0; attempt < INVOICE_NUMBER_RETRIES; attempt++) {
      if (!invoiceNumber) {
        invoiceNumber = await orderRepository.getNextInvoiceNumber();
      }

      const buffer = await renderInvoicePdf({
        order,
        buyerName: buyer.displayName || buyer.name,
        buyerEmail: buyer.email,
        invoiceNumber,
        gstBreakup,
      });

      key = buildInvoicePdfKey(orderId);

      try {
        await storageAdapter.putObject({ key, body: buffer, contentType: "application/pdf" });
        await orderRepository.updateInvoiceFields(orderId, { invoiceNumber, invoicePdfKey: key, gstBreakup });
        break;
      } catch (err) {
        const mongoErr = err as { code?: number };
        if (mongoErr.code === 11000 && attempt < INVOICE_NUMBER_RETRIES - 1) {
          invoiceNumber = "";
          continue;
        }
        throw err;
      }
    }

    logger.info("Invoice PDF generated and cached", { orderId, key, invoiceNumber });

    return storageAdapter.presignGet({ key, expiresIn: PRESIGN_TTL_SECONDS });
  },

  async persistLicenseIdentifiers(purchaseId: string): Promise<void> {
    const purchase = await purchaseRepository.findById(purchaseId);
    if (!purchase) return;
    if (purchase.licenseNumber && purchase.verificationHash) return;

    const licenseNumber = licenseVerifyService.generateLicenseNumber(purchaseId);
    const verificationHash = generateVerificationHash(
      purchaseId, purchase.orderId, purchase.paymentId
    );

    await purchaseRepository.updateLicenseFields(purchaseId, { licenseNumber, verificationHash });
  },
};
