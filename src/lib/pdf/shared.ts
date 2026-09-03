import type { IOrder } from "@/types";
import { getAppUrl } from "@/lib/app-url";

export { getAppUrl };

export const PDF_BRAND = {
  name: "Trishul Beats",
  tagline: "Premium Beats & Instrumentals",
};

export const PDF_COLORS = {
  brandDark: "#121212",
  brandAccent: "#1DB954",
  textPrimary: "#1E293B",
  textSecondary: "#64748B",
  border: "#E2E8F0",
  success: "#16a34a",
  danger: "#ef4444",
  cardBg: "#F8FAFC",
  headerSubtext: "#94A3B8",
} as const;

export function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatCurrency(amount: number): string {
  return `₹${amount.toLocaleString("en-IN")}`;
}

export function formatStreamLimit(limit: number): string {
  if (limit < 0) return "Unlimited";
  return limit.toLocaleString("en-IN");
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function orderItemTitle(item: IOrder["items"][number]): string {
  return item.serviceTitle || item.packTitle || item.beatTitle || "Item";
}

export function orderItemTier(item: IOrder["items"][number]): string {
  if (item.kind === "service_deposit") return "Deposit";
  if (item.kind === "service_balance") return "Balance";
  const tier = item.packTier || item.licenseType;
  if (!tier) return "—";
  return capitalize(tier);
}

/**
 * Collect pdfkit stream chunks into a Buffer.
 * Standardizes the pattern used across all PDF renderers.
 */
export function collectPdfBuffer(
  doc: { on: (event: string, cb: (...args: unknown[]) => void) => void; end: () => void }
): Promise<Buffer> {
  const chunks: Buffer[] = [];
  doc.on("data", (chunk: unknown) => chunks.push(chunk as Buffer));
  const ready = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });
  doc.end();
  return ready;
}

/**
 * Render the standard Trishul Beats header bar at the top of a PDF page.
 */
export function renderPdfHeader(
  doc: {
    save: () => unknown;
    rect: (x: number, y: number, w: number, h: number) => { fill: (c: string) => { restore: () => void } };
    restore: () => void;
    font: (f: string) => unknown;
    fontSize: (s: number) => unknown;
    fillColor: (c: string) => unknown;
    text: (t: string, x: number, y: number, opts?: Record<string, unknown>) => unknown;
  }
): void {
  const c = PDF_COLORS;
  const url = getAppUrl();
  // @ts-expect-error -- pdfkit chaining
  doc.save().rect(0, 0, 595.28, 90).fill(c.brandDark).restore();
  // @ts-expect-error -- pdfkit chaining
  doc.font("Helvetica-Bold").fontSize(22).fillColor("#FFFFFF").text(PDF_BRAND.name, 50, 24);
  // @ts-expect-error -- pdfkit chaining
  doc.font("Helvetica").fontSize(9).fillColor(c.brandAccent).text(PDF_BRAND.tagline, 50, 50);
  // @ts-expect-error -- pdfkit chaining
  doc.font("Helvetica").fontSize(8).fillColor(c.headerSubtext).text(url, 50, 64);
  // @ts-expect-error -- pdfkit chaining
  doc.save().rect(50, 105, 495, 3).fill(c.brandAccent).restore();
}
