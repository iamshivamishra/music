import type { IOrder, IGstBreakup } from "@/types";
import {
  PDF_BRAND,
  PDF_COLORS as C,
  formatDate,
  formatCurrency,
  getAppUrl,
  collectPdfBuffer,
  renderPdfHeader,
  orderItemTitle,
  orderItemTier,
} from "./shared";

export interface InvoicePdfInput {
  order: IOrder;
  buyerName: string;
  buyerEmail: string;
  invoiceNumber: string;
  gstBreakup: IGstBreakup;
}

export async function renderInvoicePdf(input: InvoicePdfInput): Promise<Buffer> {
  const { default: PDFDocument } = await import("pdfkit");
  const { order, buyerName, buyerEmail, invoiceNumber, gstBreakup } = input;
  const paidDate = formatDate(order.paidAt ?? order.createdAt);

  const gstin = process.env.PLATFORM_GSTIN || "";
  const legalName = process.env.PLATFORM_LEGAL_NAME || PDF_BRAND.name;
  const platformAddress = process.env.PLATFORM_ADDRESS || "";

  const doc = new PDFDocument({ size: "A4", margin: 50 });

  renderPdfHeader(doc);

  doc.font("Helvetica-Bold").fontSize(16).fillColor(C.textPrimary).text("TAX INVOICE", 50, 122);

  // Seller + Buyer info
  const cardY = 150;
  const leftCol = 65;
  const rightCol = 320;

  doc.save().roundedRect(50, cardY, 495, 100, 6).fillAndStroke(C.cardBg, C.border).restore();

  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.textSecondary).text("FROM", leftCol, cardY + 10);
  doc.font("Helvetica-Bold").fontSize(10).fillColor(C.textPrimary).text(legalName, leftCol, cardY + 24);
  if (gstin) {
    doc.font("Helvetica").fontSize(8).fillColor(C.textSecondary).text(`GSTIN: ${gstin}`, leftCol, cardY + 38);
  }
  if (platformAddress) {
    doc.font("Helvetica").fontSize(8).fillColor(C.textSecondary)
      .text(platformAddress, leftCol, cardY + 50, { width: 220 });
  }

  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.textSecondary).text("TO", rightCol, cardY + 10);
  doc.font("Helvetica-Bold").fontSize(10).fillColor(C.textPrimary).text(buyerName, rightCol, cardY + 24);
  doc.font("Helvetica").fontSize(8).fillColor(C.textSecondary).text(buyerEmail, rightCol, cardY + 38);

  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.textSecondary).text("Invoice No", rightCol, cardY + 58);
  doc.font("Helvetica").fontSize(9).fillColor(C.textPrimary).text(invoiceNumber, rightCol + 65, cardY + 58);
  doc.font("Helvetica-Bold").fontSize(8).fillColor(C.textSecondary).text("Date", rightCol, cardY + 72);
  doc.font("Helvetica").fontSize(9).fillColor(C.textPrimary).text(paidDate, rightCol + 65, cardY + 72);

  // Line items table
  const tableTop = cardY + 115;
  doc.save().rect(50, tableTop, 495, 24).fill(C.brandDark).restore();
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#FFFFFF");
  doc.text("#", 58, tableTop + 7, { width: 25 });
  doc.text("ITEM", 83, tableTop + 7, { width: 200 });
  doc.text("LICENSE", 283, tableTop + 7, { width: 80 });
  doc.text("AMOUNT", 448, tableTop + 7, { width: 90, align: "right" });

  let rowY = tableTop + 28;
  doc.font("Helvetica").fontSize(9).fillColor(C.textPrimary);

  for (let i = 0; i < order.items.length; i++) {
    const item = order.items[i];
    if (i % 2 === 0) {
      doc.save().rect(50, rowY - 4, 495, 22).fill(C.cardBg).restore();
    }
    doc.fillColor(C.textSecondary).text(String(i + 1), 58, rowY, { width: 25 });
    doc.fillColor(C.textPrimary).text(orderItemTitle(item), 83, rowY, { width: 200 });
    doc.fillColor(C.textPrimary).text(orderItemTier(item), 283, rowY, { width: 80 });
    doc.fillColor(C.textPrimary).text(formatCurrency(item.price), 448, rowY, { width: 90, align: "right" });
    rowY += 22;

    if (rowY > 650) {
      doc.addPage();
      rowY = 50;
    }
  }

  doc.moveTo(50, rowY + 2).lineTo(545, rowY + 2).strokeColor(C.border).stroke();

  // Tax breakup
  let summaryY = rowY + 14;

  doc.font("Helvetica").fontSize(9).fillColor(C.textSecondary);
  doc.text("Subtotal (excl. tax)", 350, summaryY, { width: 85 });
  doc.fillColor(C.textPrimary).text(
    formatCurrency(gstBreakup.baseAmount), 435, summaryY, { width: 100, align: "right" }
  );
  summaryY += 18;

  if (order.couponCode && (order.discountAmount ?? 0) > 0) {
    doc.font("Helvetica").fontSize(9).fillColor(C.success);
    doc.text(`Coupon (${order.couponCode})`, 350, summaryY, { width: 85 });
    doc.text(`- ${formatCurrency(order.discountAmount!)}`, 435, summaryY, { width: 100, align: "right" });
    summaryY += 18;
  }

  if (gstBreakup.igst) {
    doc.font("Helvetica").fontSize(9).fillColor(C.textSecondary);
    doc.text(`IGST @ ${gstBreakup.gstRate}%`, 350, summaryY, { width: 85 });
    doc.fillColor(C.textPrimary).text(
      formatCurrency(gstBreakup.igst), 435, summaryY, { width: 100, align: "right" }
    );
    summaryY += 18;
  } else if (gstBreakup.cgst && gstBreakup.sgst) {
    const halfRate = gstBreakup.gstRate / 2;
    doc.font("Helvetica").fontSize(9).fillColor(C.textSecondary);
    doc.text(`CGST @ ${halfRate}%`, 350, summaryY, { width: 85 });
    doc.fillColor(C.textPrimary).text(
      formatCurrency(gstBreakup.cgst), 435, summaryY, { width: 100, align: "right" }
    );
    summaryY += 18;

    doc.font("Helvetica").fontSize(9).fillColor(C.textSecondary);
    doc.text(`SGST @ ${halfRate}%`, 350, summaryY, { width: 85 });
    doc.fillColor(C.textPrimary).text(
      formatCurrency(gstBreakup.sgst), 435, summaryY, { width: 100, align: "right" }
    );
    summaryY += 18;
  }

  doc.moveTo(350, summaryY).lineTo(545, summaryY).strokeColor(C.border).stroke();
  summaryY += 6;

  // Total
  doc.save().roundedRect(350, summaryY, 195, 32, 4).fill(C.brandDark).restore();
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#FFFFFF");
  doc.text("TOTAL", 365, summaryY + 9, { width: 60 });
  doc.text(formatCurrency(order.totalAmount), 435, summaryY + 9, { width: 100, align: "right" });

  summaryY += 48;
  if (order.razorpayPaymentId) {
    doc.font("Helvetica").fontSize(8).fillColor(C.textSecondary)
      .text(`Payment ID: ${order.razorpayPaymentId}`, 350, summaryY);
  }

  // Footer
  const footerY = Math.max(summaryY + 50, 700);
  doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor(C.border).stroke();
  doc.font("Helvetica").fontSize(7).fillColor(C.textSecondary).text(
    "This is a computer-generated invoice and does not require a signature.",
    50, footerY + 10, { align: "center", width: 495 }
  );
  if (gstin) {
    doc.font("Helvetica").fontSize(7).fillColor(C.textSecondary).text(
      `GSTIN: ${gstin}  •  SAC Code: 998314 (Online content — digital music)`,
      50, footerY + 22, { align: "center", width: 495 }
    );
  }
  doc.font("Helvetica-Bold").fontSize(7).fillColor(C.brandAccent).text(
    `${PDF_BRAND.name}  •  ${getAppUrl()}`,
    50, footerY + 36, { align: "center", width: 495 }
  );

  return collectPdfBuffer(doc);
}
