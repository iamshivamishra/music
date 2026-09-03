import {
  PDF_COLORS as C,
  formatDate,
  orderItemTitle,
  orderItemTier,
  getAppUrl,
  collectPdfBuffer,
  renderPdfHeader,
} from "./shared";
import type { IOrder } from "@/types";

function itemKind(item: IOrder["items"][number]): string {
  return item.packId ? "Pack" : "Beat";
}

export interface ReceiptPdfInput {
  order: IOrder;
  buyerName: string;
  buyerEmail: string;
}

export async function renderReceiptPdf(input: ReceiptPdfInput): Promise<Buffer> {
  const { default: PDFDocument } = await import("pdfkit");
  const { order, buyerName, buyerEmail } = input;
  const appUrl = getAppUrl();
  const paidDate = formatDate(order.paidAt ?? order.createdAt);

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  renderPdfHeader(doc);

  doc.font("Helvetica-Bold").fontSize(16).fillColor(C.textPrimary).text("TRANSACTION RECEIPT", 50, 122);

  const cardY = 150;
  doc.save().roundedRect(50, cardY, 495, 80, 6).fillAndStroke(C.cardBg, C.border).restore();

  const leftCol = 65;
  const rightCol = 320;
  const row1 = cardY + 12;
  const row2 = row1 + 20;
  const row3 = row2 + 20;

  doc.fontSize(9).fillColor(C.textSecondary).font("Helvetica-Bold");
  doc.text("Receipt No", leftCol, row1);
  doc.text("Date", leftCol, row2);
  doc.text("Status", leftCol, row3);

  doc.font("Helvetica").fillColor(C.textPrimary);
  doc.text(order.receipt, leftCol + 75, row1);
  doc.text(paidDate, leftCol + 75, row2);
  doc.font("Helvetica-Bold").fillColor(C.success).text("PAID", leftCol + 75, row3);

  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.textSecondary);
  doc.text("Customer", rightCol, row1);
  doc.text("Email", rightCol, row2);
  if (order.razorpayPaymentId) doc.text("Payment ID", rightCol, row3);

  doc.font("Helvetica").fillColor(C.textPrimary);
  doc.text(buyerName, rightCol + 75, row1);
  doc.text(buyerEmail, rightCol + 75, row2);
  if (order.razorpayPaymentId) {
    doc.text(order.razorpayPaymentId, rightCol + 75, row3);
  }

  const tableTop = cardY + 100;
  doc.save().rect(50, tableTop, 495, 24).fill(C.brandDark).restore();
  doc.font("Helvetica-Bold").fontSize(8).fillColor("#FFFFFF");
  doc.text("#", 58, tableTop + 7, { width: 25 });
  doc.text("ITEM", 83, tableTop + 7, { width: 210 });
  doc.text("LICENSE", 293, tableTop + 7, { width: 75 });
  doc.text("TYPE", 373, tableTop + 7, { width: 65 });
  doc.text("AMOUNT", 448, tableTop + 7, { width: 90, align: "right" });

  let rowY = tableTop + 28;
  doc.font("Helvetica").fontSize(9).fillColor(C.textPrimary);

  for (let i = 0; i < order.items.length; i++) {
    const item = order.items[i];
    if (i % 2 === 0) {
      doc.save().rect(50, rowY - 4, 495, 22).fill(C.cardBg).restore();
    }

    doc.fillColor(C.textSecondary).text(String(i + 1), 58, rowY, { width: 25 });
    doc.fillColor(C.textPrimary).text(orderItemTitle(item), 83, rowY, { width: 210 });
    doc.fillColor(C.textPrimary).text(orderItemTier(item), 293, rowY, { width: 75 });
    doc.fillColor(C.textSecondary).text(itemKind(item), 373, rowY, { width: 65 });
    doc.fillColor(C.textPrimary).text(
      `INR ${item.price.toLocaleString("en-IN")}`,
      448, rowY, { width: 90, align: "right" }
    );
    rowY += 22;

    if (rowY > 700) {
      doc.addPage();
      rowY = 50;
    }
  }

  doc.moveTo(50, rowY + 2).lineTo(545, rowY + 2).strokeColor(C.border).stroke();

  let summaryY = rowY + 10;
  if (order.couponCode && (order.discountAmount ?? 0) > 0) {
    const subtotal = order.subtotalAmount ?? order.totalAmount + (order.discountAmount ?? 0);
    doc.font("Helvetica").fontSize(9).fillColor(C.textSecondary);
    doc.text("Subtotal", 370, summaryY + 5, { width: 65 });
    doc.fillColor(C.textPrimary).text(
      `INR ${subtotal.toLocaleString("en-IN")}`, 435, summaryY + 5, { width: 100, align: "right" }
    );
    summaryY += 20;

    doc.font("Helvetica").fontSize(9).fillColor(C.success);
    doc.text(`Coupon (${order.couponCode})`, 350, summaryY + 5, { width: 85 });
    doc.text(
      `- INR ${order.discountAmount!.toLocaleString("en-IN")}`, 435, summaryY + 5, { width: 100, align: "right" }
    );
    summaryY += 22;
    doc.moveTo(350, summaryY).lineTo(545, summaryY).strokeColor(C.border).stroke();
    summaryY += 4;
  }

  doc.save().roundedRect(350, summaryY, 195, 32, 4).fill(C.brandDark).restore();
  doc.font("Helvetica-Bold").fontSize(11).fillColor("#FFFFFF");
  doc.text("TOTAL", 365, summaryY + 9, { width: 60 });
  doc.text(
    `INR ${order.totalAmount.toLocaleString("en-IN")}`, 435, summaryY + 9, { width: 100, align: "right" }
  );

  const footerY = Math.max(summaryY + 70, 700);
  doc.moveTo(50, footerY).lineTo(545, footerY).strokeColor(C.border).stroke();
  doc.font("Helvetica").fontSize(7).fillColor(C.textSecondary).text(
    "This is a computer-generated receipt and does not require a signature.",
    50, footerY + 10, { align: "center", width: 495 }
  );
  doc.font("Helvetica-Bold").fontSize(7).fillColor(C.brandAccent).text(
    `Trishul Beats  •  ${appUrl}`, 50, footerY + 24, { align: "center", width: 495 }
  );

  return collectPdfBuffer(doc);
}
