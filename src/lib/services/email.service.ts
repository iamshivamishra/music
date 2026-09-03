import { Resend } from "resend";
import { AppError } from "@/lib/errors";
import { logger } from "@/lib/logger";
import { getAppUrl } from "@/lib/app-url";
import {
  passwordResetHtml,
  purchaseConfirmationHtml,
  saleNotificationHtml,
  producerWelcomeHtml,
  foundingInvitationHtml,
  foundingUploadNudgeHtml,
  foundingExpiredHtml,
  contactNotificationHtml,
  offerRequestNotificationHtml,
  taggedPreviewDownloadHtml,
  collabInviteHtml,
  serviceJobNotificationHtml,
} from "@/lib/email/templates";
import {
  formatPurchaseConfirmationSubject,
  type PurchaseEmailParams,
  type SaleNotificationParams,
} from "@/lib/email/types";
import type { ContactInput } from "@/lib/validators/contact";

export type {
  PurchaseEmailDownload,
  PurchaseEmailItem,
  PurchaseEmailParams,
  SaleNotificationItem,
  SaleNotificationParams,
} from "@/lib/email/types";
export { formatPurchaseConfirmationSubject } from "@/lib/email/types";

let _resend: Resend | null = null;

function getResendClient(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

const FROM_EMAIL =
  process.env.RESEND_FROM_EMAIL || "noreply@yourdomain.com";
const CONTACT_TO_EMAIL =
  process.env.CONTACT_TO_EMAIL || FROM_EMAIL;

interface PasswordResetEmailParams {
  to: string;
  name: string;
  resetUrl: string;
}

export const emailService = {
  async sendPasswordReset({ to, name, resetUrl }: PasswordResetEmailParams): Promise<void> {
    const firstName = name.split(" ")[0];
    try {
      await getResendClient().emails.send({
        from: FROM_EMAIL,
        to,
        subject: "Reset your password",
        html: passwordResetHtml(firstName, resetUrl),
      });
      logger.info("Password reset email sent", { to });
    } catch (error) {
      logger.error("Failed to send password reset email", { to, error });
      throw new AppError("Failed to send password reset email", 502, "EMAIL_SEND_FAILED");
    }
  },

  async sendPurchaseConfirmation({
    to,
    buyerName,
    items,
    totalAmount,
    orderId,
    paymentId,
    purchaseDate,
    accessUrl,
    accessCtaLabel,
  }: PurchaseEmailParams): Promise<void> {
    const firstName = buyerName.split(" ")[0];
    const dateStr = purchaseDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    try {
      await getResendClient().emails.send({
        from: FROM_EMAIL,
        to,
        subject: formatPurchaseConfirmationSubject(orderId),
        html: purchaseConfirmationHtml({
          firstName,
          items,
          totalAmount,
          paymentId,
          dateStr,
          accessUrl,
          accessCtaLabel,
        }),
      });
      logger.info("Purchase confirmation email sent", { to, orderId });
    } catch (error) {
      logger.error("Failed to send purchase confirmation email", { to, orderId, error });
    }
  },

  async sendSaleNotification({
    to,
    producerName,
    buyerName,
    items,
    totalAmount,
    purchaseDate,
  }: SaleNotificationParams): Promise<void> {
    const firstName = producerName.split(" ")[0];
    const studioUrl = `${getAppUrl()}/studio`;
    const dateStr = purchaseDate.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

    const isSingleItem = items.length === 1;
    const subject = isSingleItem
      ? `You made a sale! 🎉 — ${items[0].beatTitle}`
      : `You made ${items.length} sales! 🎉`;

    try {
      await getResendClient().emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html: saleNotificationHtml({
          firstName,
          buyerName,
          items,
          totalAmount,
          dateStr,
          studioUrl,
        }),
      });
      logger.info("Sale notification email sent", { to, itemCount: items.length });
    } catch (error) {
      logger.error("Failed to send sale notification email", { to, error });
    }
  },

  async sendProducerWelcome({ to, name }: { to: string; name: string }): Promise<void> {
    const firstName = name.split(" ")[0];
    const appUrl = getAppUrl();

    try {
      await getResendClient().emails.send({
        from: FROM_EMAIL,
        to,
        subject: "Welcome to Trishul Beats!",
        html: producerWelcomeHtml(firstName, {
          upload: `${appUrl}/upload`,
          studio: `${appUrl}/studio/beats`,
          profile: `${appUrl}/profile`,
        }),
      });
      logger.info("Producer welcome email sent", { to });
    } catch (error) {
      logger.error("Failed to send producer welcome email", { to, error });
    }
  },

  async sendFoundingInvitation({
    to,
    name,
    token,
  }: {
    to: string;
    name: string;
    token: string;
  }): Promise<void> {
    const firstName = name.split(" ")[0];
    const inviteUrl = `${getAppUrl()}/sell?invite=${token}`;

    try {
      await getResendClient().emails.send({
        from: FROM_EMAIL,
        to,
        subject: "You're invited to be a Founding Producer on Trishul Beats",
        html: foundingInvitationHtml(firstName, inviteUrl),
      });
      logger.info("Founding invitation email sent", { to });
    } catch (error) {
      logger.error("Failed to send founding invitation email", { to, error });
      throw new AppError("Failed to send founding invitation email", 502, "EMAIL_SEND_FAILED");
    }
  },

  async sendFoundingUploadNudge({
    to,
    name,
    day,
  }: {
    to: string;
    name: string;
    day: 3 | 7;
  }): Promise<void> {
    const firstName = name.split(" ")[0];
    const uploadUrl = `${getAppUrl()}/upload`;

    try {
      await getResendClient().emails.send({
        from: FROM_EMAIL,
        to,
        subject:
          day === 7
            ? "Your founding catalog is waiting — publish your first beat"
            : "Upload your first beat on Trishul Beats",
        html: foundingUploadNudgeHtml(firstName, day, uploadUrl),
      });
      logger.info("Founding upload nudge email sent", { to, day });
    } catch (error) {
      logger.error("Failed to send founding upload nudge", { to, day, error });
    }
  },

  async sendFoundingExpired({
    to,
    name,
    feePercent,
  }: {
    to: string;
    name: string;
    feePercent: number;
  }): Promise<void> {
    const firstName = name.split(" ")[0];
    const studioUrl = `${getAppUrl()}/studio`;

    try {
      await getResendClient().emails.send({
        from: FROM_EMAIL,
        to,
        subject: "Your founding producer period has ended",
        html: foundingExpiredHtml(firstName, feePercent, studioUrl),
      });
      logger.info("Founding expiry email sent", { to });
    } catch (error) {
      logger.error("Failed to send founding expiry email", { to, error });
    }
  },

  async sendContactNotification({ name, email, subject, message }: ContactInput): Promise<void> {
    try {
      await getResendClient().emails.send({
        from: FROM_EMAIL,
        to: CONTACT_TO_EMAIL,
        replyTo: email,
        subject: `Contact: ${subject}`,
        html: contactNotificationHtml({ name, email, subject, message }),
      });
      logger.info("Contact notification email sent", { from: email, subject });
    } catch (error) {
      logger.error("Failed to send contact notification email", { email, error });
      throw new AppError("Failed to send contact notification", 502, "EMAIL_SEND_FAILED");
    }
  },

  async sendOfferRequestNotification({
    to,
    producerName,
    beatTitle,
    requesterEmail,
    note,
  }: {
    to: string;
    producerName: string;
    beatTitle: string;
    requesterEmail: string;
    note?: string;
  }): Promise<void> {
    const firstName = producerName.split(" ")[0];
    const studioUrl = `${getAppUrl()}/studio/offers?tab=requests`;

    try {
      await getResendClient().emails.send({
        from: FROM_EMAIL,
        to,
        subject: `Custom price request — ${beatTitle}`,
        html: offerRequestNotificationHtml({
          firstName,
          beatTitle,
          requesterEmail,
          note,
          studioUrl,
        }),
      });
      logger.info("Offer request email sent", { to, beatTitle });
    } catch (error) {
      logger.error("Failed to send offer request email", { to, error });
    }
  },

  async sendTaggedPreviewDownload({
    to,
    beatTitle,
    downloadUrl,
  }: {
    to: string;
    beatTitle: string;
    downloadUrl: string;
  }): Promise<void> {
    try {
      await getResendClient().emails.send({
        from: FROM_EMAIL,
        to,
        subject: `Your tagged MP3 — ${beatTitle}`,
        html: taggedPreviewDownloadHtml({ beatTitle, downloadUrl }),
      });
      logger.info("Tagged preview download email sent", { to, beatTitle });
    } catch (error) {
      logger.error("Failed to send tagged preview download email", { to, error });
    }
  },

  async sendCollabInvite({
    to,
    name,
    ownerName,
    beatTitle,
    sharePercent,
    collabUrl,
  }: {
    to: string;
    name: string;
    ownerName: string;
    beatTitle: string;
    sharePercent: number;
    collabUrl: string;
  }): Promise<void> {
    const firstName = name.split(" ")[0];
    try {
      await getResendClient().emails.send({
        from: FROM_EMAIL,
        to,
        subject: `${ownerName} invited you to split “${beatTitle}”`,
        html: collabInviteHtml({
          firstName,
          ownerName,
          beatTitle,
          sharePercent,
          collabUrl,
        }),
      });
      logger.info("Collab invite email sent", { to, beatTitle });
    } catch (error) {
      logger.error("Failed to send collab invite email", { to, beatTitle, error });
    }
  },

  async sendServiceJobNotification({
    to,
    name,
    subject,
    heading,
    body,
    ctaLabel,
    ctaUrl,
  }: {
    to: string;
    name: string;
    subject: string;
    heading: string;
    body: string;
    ctaLabel: string;
    ctaUrl: string;
  }): Promise<void> {
    const firstName = name.split(" ")[0];
    try {
      await getResendClient().emails.send({
        from: FROM_EMAIL,
        to,
        subject,
        html: serviceJobNotificationHtml({
          firstName,
          heading,
          body,
          ctaLabel,
          ctaUrl,
        }),
      });
      logger.info("Service job email sent", { to, subject });
    } catch (error) {
      logger.error("Failed to send service job email", { to, error });
    }
  },
};
