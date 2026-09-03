import { userRepository } from "@/lib/repositories/user.repository";
import { notificationLogRepository } from "@/lib/repositories/notification-log.repository";
import { whatsappClient } from "@/lib/whatsapp";
import { maskPhone } from "@/lib/utils/whatsapp";
import { getAppUrl } from "@/lib/app-url";
import { logger } from "@/lib/logger";
import { isFeatureEnabled } from "@/lib/feature-flags";

const DAILY_RATE_LIMIT = 20;

function getSaleTemplate(): string {
  return process.env.WHATSAPP_TEMPLATE_SALE ?? "sale_alert_v1";
}

export interface SaleNotificationPayload {
  orderId: string;
  beatTitle: string;
  licenseName: string;
  grossAmount: number;
}

export const whatsappService = {
  /**
   * Send a WhatsApp sale alert to a producer.
   * No-op if prefs are off, number is missing, or provider is not configured.
   * Never throws — all errors are logged and swallowed.
   */
  async notifySale(
    producerId: string,
    payload: SaleNotificationPayload
  ): Promise<void> {
    try {
      if (!isFeatureEnabled("whatsappSaleAlerts")) return;
      if (!whatsappClient.isConfigured()) {
        logger.debug("WhatsApp: provider not configured, skipping sale alert", {
          producerId,
        });
        return;
      }

      const producer = await userRepository.findById(producerId);
      if (!producer) {
        logger.warn("WhatsApp: producer not found for sale alert", { producerId });
        return;
      }

      if (!producer.notificationPrefs?.saleWhatsApp) {
        logger.debug("WhatsApp: sale alerts disabled for producer", {
          producerId,
        });
        return;
      }

      const phone = producer.socialLinks?.whatsappNumber;
      if (!phone) {
        logger.debug("WhatsApp: no phone number for producer", { producerId });
        return;
      }

      const alreadySent = await notificationLogRepository.existsForOrder(
        payload.orderId,
        producerId,
        "sale",
        "whatsapp"
      );
      if (alreadySent) {
        logger.debug("WhatsApp: sale alert already sent for this order", {
          producerId,
          orderId: payload.orderId,
        });
        return;
      }

      const todayCount = await notificationLogRepository.countTodayByProducer(
        producerId,
        "whatsapp"
      );
      if (todayCount >= DAILY_RATE_LIMIT) {
        logger.warn("WhatsApp: daily rate limit reached", {
          producerId,
          todayCount,
        });
        await notificationLogRepository.create({
          producerId,
          channel: "whatsapp",
          kind: "sale",
          orderId: payload.orderId,
          status: "skipped",
          error: `Daily rate limit (${DAILY_RATE_LIMIT}) exceeded`,
        });
        return;
      }

      const log = await notificationLogRepository.create({
        producerId,
        channel: "whatsapp",
        kind: "sale",
        orderId: payload.orderId,
        status: "queued",
      });

      const appUrl = getAppUrl();
      const producerName = producer.displayName || producer.name;
      const amountFormatted = payload.grossAmount.toLocaleString("en-IN");
      const withdrawUrl = `${appUrl}/studio/payouts`;

      const result = await whatsappClient.sendTemplate({
        to: phone,
        templateName: getSaleTemplate(),
        bodyParams: [
          producerName,
          payload.beatTitle,
          payload.licenseName,
          amountFormatted,
          withdrawUrl,
        ],
      });

      if (result.success) {
        await notificationLogRepository.markSent(
          log._id.toString(),
          result.messageId
        );
        logger.info("WhatsApp: sale alert sent", {
          producerId,
          orderId: payload.orderId,
          phone: maskPhone(phone),
        });
      } else {
        await notificationLogRepository.markFailed(
          log._id.toString(),
          result.error
        );
        logger.warn("WhatsApp: sale alert failed", {
          producerId,
          orderId: payload.orderId,
          error: result.error,
        });
      }
    } catch (error) {
      logger.error("WhatsApp: unexpected error in notifySale", {
        producerId,
        orderId: payload.orderId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  },

  /**
   * Placeholder for drop-published WhatsApp notification.
   * Will be implemented in v1.2 — for now this is a no-op.
   */
  async notifyDropPublished(
    _producerId: string,
    _beatId: string
  ): Promise<void> {
    // v1.2: outbound template for new beat drops
  },
};
