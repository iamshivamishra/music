import { Badge } from "@/components/ui/badge";
import type { ServiceJobStatus } from "@/types";

const LABELS: Record<ServiceJobStatus, string> = {
  pending_deposit: "Awaiting payment",
  awaiting_acceptance: "Awaiting acceptance",
  in_progress: "In progress",
  delivered: "Delivered",
  revision_requested: "Revision requested",
  completed: "Completed",
  cancelled: "Cancelled",
  disputed: "Disputed",
};

export function JobStatusBadge({ status }: { status: ServiceJobStatus }) {
  const variant =
    status === "completed"
      ? "default"
      : status === "cancelled" || status === "disputed"
        ? "destructive"
        : "secondary";
  return <Badge variant={variant}>{LABELS[status]}</Badge>;
}
