import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { tierBadgeColor } from "@/lib/license-ui";
import type { CustomerListItem } from "@/lib/serializers/crm";
import { formatCustomerDate, formatSpend, licenseLabel } from "./format";

interface CustomerTableRowProps {
  customer: CustomerListItem;
  onSelect: (customerKey: string) => void;
}

export function CustomerTableRow({ customer, onSelect }: CustomerTableRowProps) {
  const initials = customer.name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <TableRow
      className="cursor-pointer"
      tabIndex={0}
      aria-label={`View ${customer.name}`}
      onClick={() => onSelect(customer.customerKey)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect(customer.customerKey);
        }
      }}
    >
      <TableCell>
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            {customer.avatarUrl && (
              <AvatarImage src={customer.avatarUrl} alt="" />
            )}
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="truncate font-medium">{customer.name}</p>
            {customer.email && customer.email !== customer.name && (
              <p className="truncate text-xs text-muted-foreground">{customer.email}</p>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground">{customer.orderCount}</TableCell>
      <TableCell>{formatSpend(customer.spend)}</TableCell>
      <TableCell className="hidden sm:table-cell text-muted-foreground">
        {formatCustomerDate(customer.lastPurchaseAt)}
      </TableCell>
      <TableCell className="hidden md:table-cell">
        {customer.dominantLicense ? (
          <Badge className={tierBadgeColor(customer.dominantLicense)}>
            {licenseLabel(customer.dominantLicense)}
          </Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell className="hidden lg:table-cell max-w-[180px] truncate text-muted-foreground">
        {customer.noteSnippet || "—"}
      </TableCell>
    </TableRow>
  );
}
