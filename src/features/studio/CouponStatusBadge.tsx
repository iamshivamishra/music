import { Badge } from "@/components/ui/badge";
import type { CouponStatus } from "@/types";

export function CouponStatusBadge({ status }: { status: CouponStatus }) {
  switch (status) {
    case "active":
      return <Badge className="bg-green-600/20 text-green-400 border-green-600/30">Active</Badge>;
    case "draft":
      return <Badge variant="secondary">Draft</Badge>;
    case "paused":
      return <Badge className="bg-amber-600/20 text-amber-400 border-amber-600/30">Paused</Badge>;
    case "scheduled":
      return <Badge className="bg-blue-600/20 text-blue-400 border-blue-600/30">Scheduled</Badge>;
    case "expired":
      return <Badge className="bg-red-600/20 text-red-400 border-red-600/30">Expired</Badge>;
    case "exhausted":
      return <Badge className="bg-zinc-600/20 text-zinc-400 border-zinc-600/30">Exhausted</Badge>;
    default:
      return <Badge variant="secondary">{status ?? "Unknown"}</Badge>;
  }
}
