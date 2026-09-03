import {
  PDF_COLORS as C,
  formatDate,
  formatStreamLimit,
  formatCurrency,
  capitalize,
  getAppUrl,
  collectPdfBuffer,
  renderPdfHeader,
} from "./shared";

export interface LicensePdfInput {
  purchaseId: string;
  licenseNumber: string;
  verificationHash: string;
  buyerName: string;
  buyerEmail: string;
  producerName: string;
  producerUsername?: string;
  beatTitle: string;
  beatId: string;
  bpm?: number;
  musicalKey?: string;
  genre: string;
  licenseType: string;
  licenseName: string;
  licenseTerms: string;
  includesWav: boolean;
  includesStems: boolean;
  commercialUse: boolean;
  streamLimit: number;
  price: number;
  orderId: string;
  paymentId: string;
  purchaseDate: Date;
}

export async function renderLicensePdf(input: LicensePdfInput): Promise<Buffer> {
  const { default: PDFDocument } = await import("pdfkit");
  const appUrl = getAppUrl();

  const doc = new PDFDocument({ size: "A4", margin: 50 });

  renderPdfHeader(doc);

  // Title
  doc.font("Helvetica-Bold").fontSize(18).fillColor(C.textPrimary)
    .text("BEAT LICENSE AGREEMENT", 50, 122);

  // License number badge
  doc.font("Helvetica-Bold").fontSize(10).fillColor(C.brandAccent)
    .text(input.licenseNumber, 50, 146);

  // Parties section
  let y = 170;
  const leftCol = 65;
  const rightCol = 320;

  doc.save().roundedRect(50, y, 495, 80, 6).fillAndStroke(C.cardBg, C.border).restore();

  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.textSecondary)
    .text("LICENSOR (Producer)", leftCol, y + 10);
  doc.font("Helvetica").fontSize(10).fillColor(C.textPrimary)
    .text(input.producerName, leftCol, y + 24);
  if (input.producerUsername) {
    doc.font("Helvetica").fontSize(8).fillColor(C.textSecondary)
      .text(`@${input.producerUsername}`, leftCol, y + 38);
  }

  doc.font("Helvetica-Bold").fontSize(9).fillColor(C.textSecondary)
    .text("LICENSEE (Buyer)", rightCol, y + 10);
  doc.font("Helvetica").fontSize(10).fillColor(C.textPrimary)
    .text(input.buyerName, rightCol, y + 24);
  doc.font("Helvetica").fontSize(8).fillColor(C.textSecondary)
    .text(input.buyerEmail, rightCol, y + 38);

  // Beat details
  y = 265;
  doc.font("Helvetica-Bold").fontSize(11).fillColor(C.textPrimary).text("Beat Details", 50, y);
  y += 20;

  doc.save().roundedRect(50, y, 495, 60, 6).fillAndStroke(C.cardBg, C.border).restore();

  const details = [
    { label: "Title", value: input.beatTitle },
    { label: "Genre", value: input.genre },
    { label: "BPM", value: input.bpm ? String(input.bpm) : "—" },
    { label: "Key", value: input.musicalKey || "—" },
  ];

  const colWidth = 120;
  details.forEach((d, i) => {
    const x = leftCol + i * colWidth;
    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.textSecondary).text(d.label, x, y + 12);
    doc.font("Helvetica").fontSize(10).fillColor(C.textPrimary).text(d.value, x, y + 26);
  });

  // License terms
  y += 75;
  doc.font("Helvetica-Bold").fontSize(11).fillColor(C.textPrimary).text("License Terms", 50, y);
  y += 18;

  doc.save().roundedRect(50, y, 495, 24, 4).fill(C.brandDark).restore();
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#FFFFFF").text(
    `${input.licenseName} — ${capitalize(input.licenseType)} License`,
    65, y + 7
  );
  y += 34;

  doc.font("Helvetica").fontSize(9).fillColor(C.textPrimary)
    .text(input.licenseTerms, 50, y, { width: 495, lineGap: 4 });
  y += doc.heightOfString(input.licenseTerms, { width: 495, lineGap: 4 }) + 16;

  // Rights granted
  doc.font("Helvetica-Bold").fontSize(11).fillColor(C.textPrimary).text("Rights Granted", 50, y);
  y += 18;

  const rights = [
    { label: "WAV Files", granted: input.includesWav },
    { label: "Stem Files", granted: input.includesStems },
    { label: "Commercial Use", granted: input.commercialUse },
    { label: "Stream Limit", granted: true, value: formatStreamLimit(input.streamLimit) },
  ];

  rights.forEach((r) => {
    const icon = r.granted ? "✓" : "✗";
    const color = r.granted ? C.success : C.danger;
    doc.font("Helvetica-Bold").fontSize(10).fillColor(color).text(icon, 60, y, { continued: true });
    doc.font("Helvetica").fontSize(9).fillColor(C.textPrimary).text(`  ${r.label}`, { continued: !!r.value });
    if (r.value) {
      doc.font("Helvetica").fontSize(9).fillColor(C.textSecondary).text(` — ${r.value}`);
    }
    y += 16;
  });

  // Restrictions
  y += 10;
  doc.font("Helvetica-Bold").fontSize(11).fillColor(C.textPrimary).text("Restrictions", 50, y);
  y += 18;

  const restrictions = [
    "The Licensee must credit the producer in all published works using this beat.",
    "This license is non-transferable and cannot be resold or sublicensed.",
    "The beat remains the intellectual property of the producer.",
  ];

  if (input.licenseType === "exclusive") {
    restrictions.push("This is an EXCLUSIVE license. The beat will be removed from the marketplace.");
  } else {
    restrictions.push("This is a NON-EXCLUSIVE license. The beat may be licensed to other buyers.");
  }

  restrictions.forEach((r) => {
    doc.font("Helvetica").fontSize(8).fillColor(C.textSecondary)
      .text(`•  ${r}`, 60, y, { width: 475, lineGap: 2 });
    y += doc.heightOfString(`•  ${r}`, { width: 475, lineGap: 2 }) + 4;
  });

  if (y > 620) {
    doc.addPage();
    y = 50;
  }

  // Payment confirmation
  y += 10;
  doc.font("Helvetica-Bold").fontSize(11).fillColor(C.textPrimary).text("Payment Confirmation", 50, y);
  y += 18;

  doc.save().roundedRect(50, y, 495, 80, 6).fillAndStroke(C.cardBg, C.border).restore();

  const paymentRows = [
    { label: "Amount Paid", value: formatCurrency(input.price) },
    { label: "Order ID", value: input.orderId },
    { label: "Payment ID", value: input.paymentId },
    { label: "Date", value: formatDate(input.purchaseDate) },
  ];

  paymentRows.forEach((r, i) => {
    const col = i < 2 ? leftCol : rightCol;
    const row = i % 2 === 0 ? y + 12 : y + 42;
    doc.font("Helvetica-Bold").fontSize(8).fillColor(C.textSecondary).text(r.label, col, row);
    doc.font("Helvetica").fontSize(9).fillColor(C.textPrimary).text(r.value, col + 80, row);
  });

  // Footer
  y += 100;
  doc.moveTo(50, y).lineTo(545, y).strokeColor(C.border).stroke();

  doc.font("Helvetica").fontSize(7).fillColor(C.textSecondary).text(
    `Verify this license at: ${appUrl}/profile/verify-license`,
    50, y + 10, { align: "center", width: 495 }
  );
  doc.font("Helvetica").fontSize(7).fillColor(C.textSecondary).text(
    `Verification Hash: ${input.verificationHash}`,
    50, y + 22, { align: "center", width: 495 }
  );
  doc.font("Helvetica-Bold").fontSize(7).fillColor(C.brandAccent).text(
    `${getAppUrl()}`,
    50, y + 38, { align: "center", width: 495 }
  );
  doc.font("Helvetica").fontSize(6).fillColor(C.textSecondary).text(
    "This is a computer-generated license agreement and does not require a physical signature.",
    50, y + 52, { align: "center", width: 495 }
  );

  return collectPdfBuffer(doc);
}
