import type { TaxSummary } from "@/lib/serializers/tax";
import {
  PDF_BRAND,
  PDF_COLORS as C,
  formatCurrency,
  getAppUrl,
  collectPdfBuffer,
  renderPdfHeader,
} from "./shared";

export async function renderProducerTaxSummaryPdf(pack: TaxSummary): Promise<Buffer> {
  const { default: PDFDocument } = await import("pdfkit");
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  renderPdfHeader(doc);

  doc.font("Helvetica-Bold").fontSize(16).fillColor(C.textPrimary).text("PRODUCER TAX SUMMARY", 50, 122);
  doc.font("Helvetica").fontSize(10).fillColor(C.textSecondary)
    .text(`${pack.producerName}  •  ${pack.monthLabel} (Asia/Kolkata)`, 50, 146);

  const cardY = 170;
  doc.save().roundedRect(50, cardY, 495, 88, 6).fillAndStroke(C.cardBg, C.border).restore();
  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.textSecondary).text("MONTH ACTIVITY", 65, cardY + 12);

  const activity = [
    ["Sales", String(pack.monthActivity.salesCount)],
    ["GMV (your share)", formatCurrency(pack.monthActivity.gmv)],
    ["GST (informational)", formatCurrency(pack.monthActivity.gstAmount)],
    ["Est. fee on month GMV", formatCurrency(pack.monthActivity.estimatedFee)],
    ["Payouts completed", String(pack.monthActivity.payoutsCompletedCount)],
    ["Payouts net sent", formatCurrency(pack.monthActivity.payoutsNet)],
  ];

  activity.forEach(([label, value], index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = 65 + col * 240;
    const y = cardY + 32 + row * 16;
    doc.font("Helvetica").fontSize(8).fillColor(C.textSecondary).text(label, x, y, { width: 120 });
    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.textPrimary).text(value, x + 120, y, { width: 90, align: "right" });
  });

  const lifeY = cardY + 106;
  doc.save().roundedRect(50, lifeY, 495, 92, 6).fillAndStroke(C.cardBg, C.border).restore();
  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.textSecondary).text("LIFETIME SNAPSHOT (matches Studio → Payouts)", 65, lifeY + 12);

  const life = [
    ["Gross earnings", formatCurrency(pack.lifetime.grossEarnings)],
    [`Platform fee (${pack.lifetime.feePercent}%)`, formatCurrency(pack.lifetime.platformFee)],
    ["Payouts (net sent)", formatCurrency(pack.lifetime.totalPayouts)],
    ["Withdrawable now", formatCurrency(pack.lifetime.withdrawable)],
  ];

  life.forEach(([label, value], index) => {
    const y = lifeY + 32 + index * 14;
    doc.font("Helvetica").fontSize(8).fillColor(C.textSecondary).text(label, 65, y, { width: 220 });
    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.textPrimary).text(value, 300, y, { width: 220, align: "right" });
  });

  const noteY = lifeY + 110;
  doc.font("Helvetica-Oblique").fontSize(8).fillColor(C.textSecondary)
    .text(pack.feeNote, 50, noteY, { width: 495 });

  const discY = noteY + 36;
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.textPrimary).text("Disclaimer", 50, discY);
  doc.font("Helvetica").fontSize(8).fillColor(C.textSecondary)
    .text(pack.disclaimer, 50, discY + 14, { width: 495 });

  if (pack.overflow) {
    doc.font("Helvetica").fontSize(8).fillColor(C.danger)
      .text("This month has more than 10,000 sales. Line items in CSV/ZIP are capped; totals above use the full month.", 50, discY + 70, { width: 495 });
  }

  const footerY = 740;
  doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor(C.border).stroke();
  doc.font("Helvetica-Bold").fontSize(7).fillColor(C.brandAccent).text(
    `${PDF_BRAND.name}  •  ${getAppUrl()}`,
    50, footerY + 10, { align: "center", width: 495 }
  );

  return collectPdfBuffer(doc);
}
