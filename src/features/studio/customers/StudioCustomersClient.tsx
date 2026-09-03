"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pagination } from "@/components/ui/Pagination";
import { CustomerTableRow } from "@/features/studio/customers/CustomerTableRow";
import { CustomerDetailSheet } from "@/features/studio/customers/CustomerDetailSheet";
import type { CustomerListItem } from "@/lib/serializers/crm";
import type { PaginatedResult } from "@/types";

interface Props {
  customers: CustomerListItem[];
  pagination: Omit<PaginatedResult<CustomerListItem>, "data">;
  query: string;
}

function customersPageUrl(page: number, q: string) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (q) params.set("q", q);
  const qs = params.toString();
  return qs ? `/studio/customers?${qs}` : "/studio/customers";
}

export default function StudioCustomersClient({
  customers,
  pagination,
  query,
}: Props) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const isEmpty = pagination.total === 0 && !query;
  const noResults = pagination.total === 0 && Boolean(query);

  return (
    <div className="page-shell max-w-6xl">
      <div className="page-header">
        <h1 className="page-title">Customers</h1>
        <p className="text-muted-foreground">
          Repeat buyers and guests who have paid you
        </p>
      </div>

      {!isEmpty && (
        <form
          action="/studio/customers"
          method="get"
          className="relative mb-6 w-full sm:max-w-xs"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="q"
            defaultValue={query}
            placeholder="Search name or email"
            aria-label="Search customers"
            className="pl-9"
          />
        </form>
      )}

      {isEmpty ? (
        <Card className="rounded-2xl border-border/50 bg-card/60 shadow-sm">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Users className="mb-3 h-12 w-12 text-muted-foreground" aria-hidden="true" />
            <p className="text-lg font-medium">Customers appear after your first sale</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Anyone who buys a beat or pack from you will show up here.
            </p>
            <Button asChild className="mt-4" size="lg">
              <Link href="/studio/beats">Go to my beats</Link>
            </Button>
          </CardContent>
        </Card>
      ) : noResults ? (
        <Card className="rounded-2xl border-border/50 bg-card/60 shadow-sm">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <p className="text-lg font-medium">No customers match “{query}”</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Try a different name or email.
            </p>
            <Button asChild variant="outline" size="sm" className="mt-4">
              <Link href="/studio/customers">Clear search</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden rounded-2xl border-border/50 bg-card/80 shadow-sm">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Customer</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Spend</TableHead>
                <TableHead className="hidden sm:table-cell">Last buy</TableHead>
                <TableHead className="hidden md:table-cell">Tier</TableHead>
                <TableHead className="hidden lg:table-cell">Note</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <CustomerTableRow
                  key={customer.customerKey}
                  customer={customer}
                  onSelect={setSelectedKey}
                />
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <div className="mt-6">
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          getPageUrl={(page) => customersPageUrl(page, query)}
        />
      </div>

      <CustomerDetailSheet
        customerKey={selectedKey}
        onOpenChange={(open) => {
          if (!open) setSelectedKey(null);
        }}
      />
    </div>
  );
}
