import { Badge } from "@/components/ui/badge";
import { tierBadgeColor } from "@/lib/license-ui";
import type { CustomerPurchaseHistoryItem } from "@/lib/serializers/crm";
import { formatCustomerDate, formatSpend, licenseLabel } from "./format";

export function CustomerPurchaseList({
  purchases,
}: {
  purchases: CustomerPurchaseHistoryItem[];
}) {
  return (
    <ul className="space-y-2">
      {purchases.map((purchase) => (
        <li
          key={purchase.purchaseId}
          className="rounded-lg border border-border/50 bg-card px-3 py-2"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate font-medium">{purchase.title}</p>
              <p className="text-xs text-muted-foreground">
                {purchase.kind === "pack" ? "Pack" : "Beat"} ·{" "}
                {formatCustomerDate(purchase.purchasedAt)}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <span className="text-sm">{formatSpend(purchase.amount)}</span>
              {purchase.licenseType && (
                <Badge className={tierBadgeColor(purchase.licenseType)}>
                  {licenseLabel(purchase.licenseType)}
                </Badge>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
