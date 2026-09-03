import { userRepository } from "@/lib/repositories/user.repository";
import { emailService } from "@/lib/services/email.service";
import { getAppUrl } from "@/lib/app-url";
import { logger } from "@/lib/logger";
import type { IServiceJob } from "@/types";

export type ServiceJobEmailKind = "new" | "accepted" | "delivered" | "declined";

export const serviceJobEmailService = {
  notify(kind: ServiceJobEmailKind, job: IServiceJob): void {
    this.send(kind, job).catch((error) => {
      logger.warn("Service job email failed", {
        kind,
        jobId: job._id,
        error: error instanceof Error ? error.message : String(error),
      });
    });
  },

  notifyDispute(job: IServiceJob, jobId: string): void {
    const contact = process.env.CONTACT_TO_EMAIL;
    if (!contact) return;
    emailService
      .sendServiceJobNotification({
        to: contact,
        name: "Admin",
        subject: `Service dispute: ${job.listingTitle}`,
        heading: "Service job disputed",
        body: `Job ${jobId} for "${job.listingTitle}" was marked disputed. Review in admin within 5 business days.`,
        ctaLabel: "Open admin jobs",
        ctaUrl: `${getAppUrl()}/admin/jobs`,
      })
      .catch(() => {});
  },

  async send(kind: ServiceJobEmailKind, job: IServiceJob): Promise<void> {
    const [producer, buyer] = await Promise.all([
      userRepository.findById(job.producerId.toString()),
      userRepository.findById(job.buyerId.toString()),
    ]);
    if (!producer || !buyer) return;

    const appUrl = getAppUrl();
    if (kind === "new" && producer.email) {
      await emailService.sendServiceJobNotification({
        to: producer.email,
        name: producer.displayName || producer.name,
        subject: `New service request: ${job.listingTitle}`,
        heading: "New service booking",
        body: `${buyer.displayName || buyer.name} booked "${job.listingTitle}" and paid a ₹${job.depositAmount.toLocaleString("en-IN")} deposit. Accept within 72 hours or the deposit is refunded.`,
        ctaLabel: "Open jobs inbox",
        ctaUrl: `${appUrl}/studio/jobs`,
      });
    }
    if (kind === "accepted" && buyer.email) {
      await emailService.sendServiceJobNotification({
        to: buyer.email,
        name: buyer.displayName || buyer.name,
        subject: `Your booking was accepted: ${job.listingTitle}`,
        heading: "Booking accepted",
        body: `${producer.displayName || producer.name} accepted your request for "${job.listingTitle}". Work is in progress.`,
        ctaLabel: "View job",
        ctaUrl: `${appUrl}/profile/jobs/${job._id}`,
      });
    }
    if (kind === "delivered" && buyer.email) {
      await emailService.sendServiceJobNotification({
        to: buyer.email,
        name: buyer.displayName || buyer.name,
        subject: `Delivery ready: ${job.listingTitle}`,
        heading: "Files delivered",
        body:
          job.balanceAmount > 0
            ? `Your files for "${job.listingTitle}" are ready. Pay the remaining ₹${job.balanceAmount.toLocaleString("en-IN")} to unlock the download.`
            : `Your files for "${job.listingTitle}" are ready to download.`,
        ctaLabel: "Open job",
        ctaUrl: `${appUrl}/profile/jobs/${job._id}`,
      });
    }
    if (kind === "declined" && buyer.email) {
      await emailService.sendServiceJobNotification({
        to: buyer.email,
        name: buyer.displayName || buyer.name,
        subject: `Booking cancelled: ${job.listingTitle}`,
        heading: "Deposit refunded",
        body: `The producer did not take on "${job.listingTitle}". Your deposit of ₹${job.depositAmount.toLocaleString("en-IN")} is being refunded.`,
        ctaLabel: "View jobs",
        ctaUrl: `${appUrl}/profile/jobs`,
      });
    }
  },
};
