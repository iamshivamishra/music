import { logger } from "./logger";

export type AuditAction =
  | "user.signup"
  | "user.login"
  | "user.role_change"
  | "beat.create"
  | "beat.update"
  | "beat.delete"
  | "beat.publish"
  | "beat.unpublish"
  | "beat.exclusive_sold"
  | "beat.collab_invited"
  | "beat.collab_cancelled"
  | "beat.collab_accepted"
  | "beat.collab_declined"
  | "license.create"
  | "license.update"
  | "license.delete"
  | "payment.order_created"
  | "payment.signature_invalid"
  | "payment.verified"
  | "payment.failed"
  | "webhook.payment_captured"
  | "webhook.payment_failed"
  | "coupon.applied"
  | "download.links_generated"
  | "download.signed_url"
  | "upload.presign"
  | "cart.checkout"
  | "pack.create"
  | "pack.update"
  | "pack.delete"
  | "pack.publish"
  | "pack.unpublish"
  | "pack.purchase"
  | "pack.upgrade"
  | "user.forgot_password"
  | "user.password_reset"
  | "store.update"
  | "payout.requested"
  | "payout.approved"
  | "payout.rejected"
  | "payout.completed"
  | "payout.failed"
  | "waitlist.join"
  | "waitlist.invite"
  | "admin.action"
  | "admin.role_change"
  | "admin.verify_toggle"
  | "purchase.created"
  | "license.reset_defaults"
  | "offer.requested"
  | "offer.created"
  | "offer.withdrawn"
  | "offer.accepted"
  | "offer.expired"
  | "service.listing_created"
  | "service.listing_updated"
  | "service.listing_deleted"
  | "service.job_created"
  | "service.job_accepted"
  | "service.job_declined"
  | "service.job_delivered"
  | "service.job_completed"
  | "service.job_cancelled"
  | "service.job_disputed"
  | "service.revision_requested"
  | "payment.refunded"
  | "lead.captured"
  | "download.tagged_preview"
  | "tax.export";

interface AuditEntry {
  action: AuditAction;
  userId?: string;
  resourceType?: string;
  resourceId?: string;
  ip?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Structured audit logger for security-sensitive actions.
 *
 * Currently writes to stdout in structured JSON format.
 * In production, these logs can be ingested by a log aggregation
 * service (Datadog, CloudWatch, Loki, etc.) for monitoring and alerting.
 */
export function audit(entry: AuditEntry): void {
  const record = {
    type: "AUDIT",
    timestamp: new Date().toISOString(),
    ...entry,
  };

  logger.info(`AUDIT: ${entry.action}`, record);
}
