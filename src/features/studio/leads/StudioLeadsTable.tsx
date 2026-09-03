import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StudioLeadRow } from "@/lib/serializers/lead";

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

interface StudioLeadsTableProps {
  rows: StudioLeadRow[];
  page: number;
  totalPages: number;
  hasPrev: boolean;
  hasNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function StudioLeadsTable({
  rows,
  page,
  totalPages,
  hasPrev,
  hasNext,
  onPrev,
  onNext,
}: StudioLeadsTableProps) {
  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Beat</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>WhatsApp</TableHead>
            <TableHead>Source</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell className="text-sm text-muted-foreground">
                {formatDate(lead.createdAt)}
              </TableCell>
              <TableCell className="font-medium">{lead.beatTitle || "—"}</TableCell>
              <TableCell>{lead.email || "—"}</TableCell>
              <TableCell>{lead.whatsappNumber || "—"}</TableCell>
              <TableCell className="text-muted-foreground">
                {lead.source === "free_download" ? "Free download" : lead.source}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
      <div className="flex items-center justify-between border-t border-border/40 px-4 py-3">
        <p className="text-sm text-muted-foreground">
          Page {page} of {totalPages || 1}
        </p>
        <div className="flex gap-2">
          <Button type="button" variant="outline" size="sm" disabled={!hasPrev} onClick={onPrev}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            Prev
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={!hasNext} onClick={onNext}>
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      </div>
    </>
  );
}
