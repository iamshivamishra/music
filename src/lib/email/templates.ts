import type { PurchaseEmailItem } from "@/lib/email/types";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function baseWrapper(body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a;">
${body}
</body>
</html>`;
}

function primaryButton(href: string, label: string): string {
  return `<a href="${href}" style="display: inline-block; background: #171717; color: #fff; padding: 12px 28px; border-radius: 6px; text-decoration: none; font-weight: 500;">${label}</a>`;
}

function accentButton(href: string, label: string): string {
  return `<a href="${href}" style="display: inline-block; background: #1DB954; color: #121212; padding: 14px 32px; border-radius: 500px; text-decoration: none; font-weight: 700; font-size: 15px;">${label}</a>`;
}

function footnote(text: string): string {
  return `<p style="margin: 24px 0 0; font-size: 13px; color: #666; line-height: 1.5;">${text}</p>`;
}

function getSupportEmail(): string {
  return (
    process.env.SUPPORT_EMAIL ||
    process.env.CONTACT_TO_EMAIL ||
    "support@trishulbeats.com"
  );
}

function helpLine(): string {
  const supportEmail = esc(getSupportEmail());
  return `<p style="margin: 16px 0 0; font-size: 12px; color: #999; line-height: 1.5;">Questions? Reply to this email or contact us at <a href="mailto:${supportEmail}" style="color: #666;">${supportEmail}</a></p>`;
}

function fallbackLink(url: string): string {
  return `<p style="margin: 16px 0 0; font-size: 13px; color: #999; line-height: 1.5;">Button not working? Paste this link in your browser:<br /><a href="${url}" style="color: #666; word-break: break-all;">${url}</a></p>`;
}

// ---------- Password Reset ----------

export function passwordResetHtml(firstName: string, resetUrl: string): string {
  return baseWrapper(`
  <h2 style="margin: 0 0 16px;">Reset your password</h2>
  <p style="margin: 0 0 12px; line-height: 1.5;">Hi ${firstName},</p>
  <p style="margin: 0 0 24px; line-height: 1.5;">
    We received a request to reset your password. Click the button below to choose a new one.
    This link expires in 1 hour.
  </p>
  ${primaryButton(resetUrl, "Reset Password")}
  ${footnote("If you didn&rsquo;t request this, you can safely ignore this email. Your password won&rsquo;t change until you create a new one.")}
  ${fallbackLink(resetUrl)}
  `);
}

// ---------- Purchase Confirmation ----------

export const PURCHASE_EMAIL_TRUNCATE_THRESHOLD = 10;
export const PURCHASE_EMAIL_VISIBLE_ITEMS = 8;

function itemSubtitle(item: PurchaseEmailItem): string {
  const parts = [`by ${esc(item.producerName)}`, esc(item.licenseName)];
  if (item.packBeatCount && item.packBeatCount > 0) {
    parts.push(`${item.packBeatCount} ${item.packBeatCount === 1 ? "beat" : "beats"}`);
  }
  return parts.join(" &middot; ");
}

function itemActionRow(item: PurchaseEmailItem): string {
  const buttons = item.downloads
    .filter((d) => d.url)
    .map((d) => primaryButton(esc(d.url), esc(d.label)))
    .join("&nbsp;");
  const pdfLink = item.licensePdfUrl
    ? `<a href="${esc(item.licensePdfUrl)}" style="font-size: 12px; color: #171717; font-weight: 500;">License PDF</a>`
    : "";

  if (!buttons && !pdfLink) return "";

  return `<tr>
          <td colspan="2" style="padding: 0 0 12px;">
            ${buttons}${buttons && pdfLink ? "&nbsp;&nbsp;" : ""}${pdfLink}
          </td>
        </tr>`;
}

export function purchaseConfirmationHtml(params: {
  firstName: string;
  items: PurchaseEmailItem[];
  totalAmount: number;
  paymentId: string;
  dateStr: string;
  accessUrl: string;
  accessCtaLabel: string;
}): string {
  const { firstName, items, totalAmount, paymentId, dateStr, accessUrl, accessCtaLabel } =
    params;

  const truncated = items.length > PURCHASE_EMAIL_TRUNCATE_THRESHOLD;
  const visibleItems = truncated
    ? items.slice(0, PURCHASE_EMAIL_VISIBLE_ITEMS)
    : items;
  const hiddenCount = items.length - visibleItems.length;

  const itemRows = visibleItems
    .map(
      (item) =>
        `<tr>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
            <strong>${esc(item.beatTitle)}</strong>
            <br /><span style="font-size: 12px; color: #666;">${itemSubtitle(item)}</span>
          </td>
          <td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right; vertical-align: top;">₹${item.price.toLocaleString("en-IN")}</td>
        </tr>
        ${itemActionRow(item)}`
    )
    .join("");

  const truncationRow =
    hiddenCount > 0
      ? `<tr>
          <td colspan="2" style="padding: 12px 0; font-size: 13px; color: #666;">
            and ${hiddenCount} more in your library
          </td>
        </tr>`
      : "";

  return baseWrapper(`
  <h2 style="margin: 0 0 4px;">Trishul Beats — Purchase Confirmation</h2>
  <p style="margin: 0 0 24px; font-size: 13px; color: #666;">${dateStr}</p>
  <p style="margin: 0 0 12px; line-height: 1.5;">Hi ${esc(firstName)},</p>
  <p style="margin: 0 0 24px; line-height: 1.5;">Your purchase is complete! Here are your beats:</p>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
    <thead>
      <tr style="border-bottom: 2px solid #171717;">
        <th style="text-align: left; padding: 8px 0; font-size: 13px;">Item</th>
        <th style="text-align: right; padding: 8px 0; font-size: 13px;">Price</th>
      </tr>
    </thead>
    <tbody>${itemRows}${truncationRow}</tbody>
    <tfoot>
      <tr>
        <td style="padding: 12px 0; font-weight: 600;">Total Paid</td>
        <td style="padding: 12px 0; font-weight: 600; text-align: right;">₹${totalAmount.toLocaleString("en-IN")}</td>
      </tr>
    </tfoot>
  </table>
  <p style="margin: 0 0 8px; font-size: 13px; color: #666;">Payment Ref: ${esc(paymentId)}</p>
  <p style="margin: 0 0 24px; font-size: 13px; color: #666;">
    Download links expire in 24 hours. You can always access your files here:
  </p>
  ${primaryButton(esc(accessUrl), esc(accessCtaLabel))}
  ${footnote("Your license agreements are available as PDFs from your library (logged-in buyers) or download page. Each license has a unique license number you can use to verify ownership.")}
  ${helpLine()}
  `);
}

// ---------- Sale Notification ----------

interface SaleItem {
  beatTitle: string;
  licenseName: string;
  amount: number;
}

export function saleNotificationHtml(params: {
  firstName: string;
  buyerName: string;
  items: SaleItem[];
  totalAmount: number;
  dateStr: string;
  studioUrl: string;
}): string {
  const { firstName, buyerName, items, totalAmount, dateStr, studioUrl } = params;

  const itemRows = items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
            <strong>${esc(item.beatTitle)}</strong>
            <br /><span style="font-size: 12px; color: #666;">${esc(item.licenseName)}</span>
          </td>
          <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">₹${item.amount.toLocaleString("en-IN")}</td>
        </tr>`
    )
    .join("");

  return baseWrapper(`
  <h2 style="margin: 0 0 16px;">🎉 You made a sale!</h2>
  <p style="margin: 0 0 12px; line-height: 1.5;">Hi ${esc(firstName)},</p>
  <p style="margin: 0 0 24px; line-height: 1.5;"><strong>${esc(buyerName)}</strong> just purchased from you:</p>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
    <tbody>${itemRows}</tbody>
    <tfoot>
      <tr>
        <td style="padding: 12px 0; font-weight: 600;">Total</td>
        <td style="padding: 12px 0; font-weight: 600; text-align: right;">₹${totalAmount.toLocaleString("en-IN")}</td>
      </tr>
    </tfoot>
  </table>
  <p style="margin: 0 0 24px; font-size: 13px; color: #666;">Date: ${dateStr}</p>
  ${primaryButton(studioUrl, "View in Studio Dashboard")}
  ${helpLine()}
  `);
}

// ---------- Producer Welcome ----------

export function producerWelcomeHtml(firstName: string, urls: {
  upload: string;
  studio: string;
  profile: string;
}): string {
  return baseWrapper(`
  <h2 style="margin: 0 0 16px;">Welcome to Trishul Beats, ${firstName}!</h2>
  <p style="margin: 0 0 12px; line-height: 1.5;">You&rsquo;re all set up as a producer. Here&rsquo;s how to get started:</p>
  <ol style="margin: 0 0 24px; padding-left: 20px; line-height: 1.8;">
    <li><strong>Upload your first beat</strong> — add a tagged preview, master WAV, and cover art.</li>
    <li><strong>Set your prices</strong> — choose license tiers (Basic, Premium, Unlimited).</li>
    <li><strong>Publish</strong> — your beat goes live on the marketplace instantly.</li>
    <li><strong>Get paid</strong> — earn in INR when artists buy your beats.</li>
  </ol>
  ${accentButton(urls.upload, "Upload Your First Beat")}
  <p style="margin: 24px 0 0; line-height: 1.5;"><strong>Useful links:</strong></p>
  <ul style="margin: 8px 0 0; padding-left: 20px; line-height: 1.8;">
    <li><a href="${urls.studio}" style="color: #1DB954;">Studio Dashboard</a> — manage your beats, view analytics</li>
    <li><a href="${urls.profile}" style="color: #1DB954;">Profile Setup</a> — add your bio, social links, and avatar</li>
  </ul>
  ${helpLine()}
  `);
}

// ---------- Founding Invitation ----------

export function foundingInvitationHtml(firstName: string, inviteUrl: string): string {
  return baseWrapper(`
  <h2 style="margin: 0 0 16px;">You&rsquo;re Invited!</h2>
  <p style="margin: 0 0 12px; line-height: 1.5;">Hi ${esc(firstName)},</p>
  <p style="margin: 0 0 20px; line-height: 1.5;">
    You&rsquo;ve been selected to join <strong>Trishul Beats</strong> as a <strong>Founding Producer</strong>.
    This is a limited-time invitation with exclusive benefits:
  </p>
  <ul style="margin: 0 0 24px; padding-left: 20px; line-height: 1.8;">
    <li><strong>0% platform fee</strong> for your first 6 months &mdash; keep 100% of every sale</li>
    <li><strong>Founding Producer badge</strong> on your profile &mdash; forever</li>
    <li><strong>Featured placement</strong> in the marketplace during your founding period</li>
    <li><strong>Priority support</strong> from the Trishul Beats team</li>
  </ul>
  <p style="margin: 0 0 24px; line-height: 1.5;">
    What we need from you: <strong>publish 5 or more beats within 2 weeks</strong> of joining.
  </p>
  ${accentButton(inviteUrl, "Accept Your Invitation")}
  ${footnote("This invitation expires in 7 days. If you didn&rsquo;t expect this email, you can safely ignore it.")}
  ${fallbackLink(inviteUrl)}
  `);
}

export function foundingUploadNudgeHtml(
  firstName: string,
  day: 3 | 7,
  uploadUrl: string
): string {
  const urgency =
    day === 7
      ? "Your founding invitation asked for 5 published beats within 2 weeks. Upload today so your catalog can go live."
      : "Founding producers publish 5 or more beats within 2 weeks. Upload your first beat to keep your featured placement.";

  return baseWrapper(`
  <h2 style="margin: 0 0 16px;">Time to upload your first beat</h2>
  <p style="margin: 0 0 12px; line-height: 1.5;">Hi ${esc(firstName)},</p>
  <p style="margin: 0 0 20px; line-height: 1.5;">
    It&rsquo;s been ${day} days since you joined Trishul Beats as a Founding Producer, and you don&rsquo;t have a published beat yet.
  </p>
  <p style="margin: 0 0 24px; line-height: 1.5;">${esc(urgency)}</p>
  ${accentButton(uploadUrl, "Upload a beat")}
  ${helpLine()}
  ${fallbackLink(uploadUrl)}
  `);
}

export function foundingExpiredHtml(
  firstName: string,
  feePercent: number,
  studioUrl: string
): string {
  return baseWrapper(`
  <h2 style="margin: 0 0 16px;">Your founding period has ended</h2>
  <p style="margin: 0 0 12px; line-height: 1.5;">Hi ${esc(firstName)},</p>
  <p style="margin: 0 0 20px; line-height: 1.5;">
    Thank you for helping launch Trishul Beats. Your 6-month founding fee benefit has ended.
    The standard platform fee of <strong>${feePercent}%</strong> now applies to new sales.
  </p>
  <p style="margin: 0 0 24px; line-height: 1.5;">
    Your Founding Producer badge stays on your profile. You can review earnings anytime in Studio.
  </p>
  ${primaryButton(studioUrl, "Open Studio")}
  ${helpLine()}
  ${fallbackLink(studioUrl)}
  `);
}

export function collabInviteHtml(params: {
  firstName: string;
  ownerName: string;
  beatTitle: string;
  sharePercent: number;
  collabUrl: string;
}): string {
  return baseWrapper(`
  <h2 style="margin: 0 0 16px;">You&rsquo;re invited as a collaborator</h2>
  <p style="margin: 0 0 12px; line-height: 1.5;">Hi ${esc(params.firstName)},</p>
  <p style="margin: 0 0 20px; line-height: 1.5;">
    <strong>${esc(params.ownerName)}</strong> invited you to split payouts on
    <strong>${esc(params.beatTitle)}</strong>. Your share would be
    <strong>${params.sharePercent}%</strong> of each sale.
  </p>
  <p style="margin: 0 0 24px; line-height: 1.5;">
    The split is inactive until you accept. You can decline from Studio.
  </p>
  ${accentButton(params.collabUrl, "Review invite")}
  ${footnote("This invitation expires in 14 days. If you didn&rsquo;t expect this, you can ignore it.")}
  ${fallbackLink(params.collabUrl)}
  `);
}

// ---------- Offer Request ----------

export function offerRequestNotificationHtml(params: {
  firstName: string;
  beatTitle: string;
  requesterEmail: string;
  note?: string;
  studioUrl: string;
}): string {
  const noteBlock = params.note
    ? `<div style="padding: 16px; background: #f5f5f5; border-radius: 6px; line-height: 1.6; margin: 0 0 24px;">${esc(params.note).replace(/\n/g, "<br />")}</div>`
    : "";

  return baseWrapper(`
  <h2 style="margin: 0 0 16px;">Custom price request</h2>
  <p style="margin: 0 0 12px; line-height: 1.5;">Hi ${esc(params.firstName)},</p>
  <p style="margin: 0 0 16px; line-height: 1.5;">
    <strong>${esc(params.requesterEmail)}</strong> requested a custom price for
    <strong>${esc(params.beatTitle)}</strong>.
  </p>
  ${noteBlock}
  ${primaryButton(params.studioUrl, "Review in Studio")}
  ${helpLine()}
  `);
}

// ---------- Tagged preview download ----------

export function taggedPreviewDownloadHtml(params: {
  beatTitle: string;
  downloadUrl: string;
}): string {
  return baseWrapper(`
  <h2 style="margin: 0 0 16px;">Your tagged MP3 is ready</h2>
  <p style="margin: 0 0 12px; line-height: 1.5;">Here is your free tagged preview of <strong>${esc(params.beatTitle)}</strong>.</p>
  <p style="margin: 0 0 24px; line-height: 1.5;">This MP3 includes producer tags. WAV and stems require a license. The download link expires in 1 hour.</p>
  ${accentButton(params.downloadUrl, "Download tagged MP3")}
  ${fallbackLink(params.downloadUrl)}
  ${footnote("You asked for this download. WAV/stems are not included.")}
  `);
}

// ---------- Contact Notification ----------

export function contactNotificationHtml(params: {
  name: string;
  email: string;
  subject: string;
  message: string;
}): string {
  const escapedMessage = esc(params.message).replace(/\n/g, "<br />");
  return baseWrapper(`
  <h2 style="margin: 0 0 16px;">New contact message</h2>
  <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
    <tr><td style="padding: 8px 0; color: #666; width: 80px;">From</td><td style="padding: 8px 0; font-weight: 500;">${esc(params.name)}</td></tr>
    <tr><td style="padding: 8px 0; color: #666;">Email</td><td style="padding: 8px 0;"><a href="mailto:${esc(params.email)}" style="color: #171717;">${esc(params.email)}</a></td></tr>
    <tr><td style="padding: 8px 0; color: #666;">Subject</td><td style="padding: 8px 0; font-weight: 500;">${esc(params.subject)}</td></tr>
  </table>
  <div style="padding: 16px; background: #f5f5f5; border-radius: 6px; line-height: 1.6;">${escapedMessage}</div>
  `);
}

export function serviceJobNotificationHtml(params: {
  firstName: string;
  heading: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
}): string {
  return baseWrapper(`
  <h2 style="margin: 0 0 16px;">${esc(params.heading)}</h2>
  <p style="margin: 0 0 12px; line-height: 1.5;">Hi ${esc(params.firstName)},</p>
  <p style="margin: 0 0 24px; line-height: 1.5;">${esc(params.body)}</p>
  ${primaryButton(params.ctaUrl, params.ctaLabel)}
  ${helpLine()}
  ${fallbackLink(params.ctaUrl)}
  `);
}
