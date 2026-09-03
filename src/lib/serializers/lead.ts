import type { ILead } from "@/types";

export interface StudioLeadRow {
  id: string;
  beatId: string;
  beatTitle: string;
  email: string | null;
  whatsappNumber: string | null;
  source: ILead["source"];
  createdAt: string;
}

export function toStudioLeadRow(lead: ILead, beatTitle: string): StudioLeadRow {
  const createdAt =
    lead.createdAt instanceof Date
      ? lead.createdAt.toISOString()
      : String(lead.createdAt ?? "");

  return {
    id: lead._id?.toString() ?? "",
    beatId: lead.beatId.toString(),
    beatTitle,
    email: lead.email ?? null,
    whatsappNumber: lead.whatsappNumber ?? null,
    source: lead.source,
    createdAt,
  };
}

const CSV_FOOTER = "Do not buy third-party lists.";

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function toLeadsCsv(rows: StudioLeadRow[]): string {
  const header = ["Date", "Beat", "Email", "WhatsApp", "Source"];
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        csvEscape(row.createdAt),
        csvEscape(row.beatTitle),
        csvEscape(row.email ?? ""),
        csvEscape(row.whatsappNumber ?? ""),
        csvEscape(row.source),
      ].join(",")
    ),
    "",
    csvEscape(CSV_FOOTER),
  ];
  return `${lines.join("\n")}\n`;
}

