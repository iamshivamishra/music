"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  IndianRupee, ShoppingBag, ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { tierBadgeColor } from "@/lib/license-ui";

interface SaleRow {
  purchaseId: string;
  beatTitle: string;
  beatId: string;
  licenseType: string;
  amount: number;
  shareAmount: number;
  sharePercent: number;
  isCollab: boolean;
  buyerName: string;
  createdAt: string;
}

interface SalesData {
  data: SaleRow[];
  total: number;
  page: number;
  totalPages: number;
}


function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SalesClient() {
  const [sales, setSales] = useState<SalesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  const fetchSales = async (p: number) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/studio/sales?page=${p}&limit=20`);
      if (res.ok) {
        const data = await res.json();
        setSales(data);
        setPage(data.page);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales(1);
  }, []);

  const totalRevenue = sales
    ? sales.data.reduce((sum, s) => sum + (s.shareAmount ?? s.amount), 0)
    : 0;

  return (
    <div className="page-shell max-w-6xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="page-title">Sales History</h1>
        <p className="text-muted-foreground">
          {sales ? `${sales.total} total sales` : "Loading..."}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2">
        <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Total Sales
            </CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {sales ? (
              <p className="text-3xl font-bold">{sales.total}</p>
            ) : (
              <Skeleton className="h-9 w-16" />
            )}
          </CardContent>
        </Card>
        <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Page Revenue
            </CardTitle>
            <IndianRupee className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {sales ? (
              <p className="text-3xl font-bold text-green-400">
                ₹{totalRevenue.toLocaleString()}
              </p>
            ) : (
              <Skeleton className="h-9 w-24" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : sales && sales.data.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Beat</TableHead>
                    <TableHead>Buyer</TableHead>
                    <TableHead>License</TableHead>
                    <TableHead className="text-right">Your share</TableHead>
                    <TableHead className="text-right">Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sales.data.map((sale) => (
                    <TableRow key={sale.purchaseId}>
                      <TableCell>
                        <Link
                          href={`/studio/beats/${sale.beatId}/edit`}
                          className="font-medium hover:text-primary"
                        >
                          {sale.beatTitle}
                        </Link>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {sale.buyerName || "—"}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs ${tierBadgeColor(sale.licenseType)}`}>
                          {sale.licenseType}
                        </Badge>
                        {sale.isCollab && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            Collab
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-400">
                        ₹{(sale.shareAmount ?? sale.amount).toLocaleString()}
                        {sale.sharePercent ? (
                          <span className="ml-1 text-xs text-muted-foreground">
                            ({sale.sharePercent}%)
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        <div>{formatDate(sale.createdAt)}</div>
                        <div className="text-xs">{formatTime(sale.createdAt)}</div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {sales.totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-border/50 px-4 py-3">
                  <p className="text-sm text-muted-foreground">
                    Page {sales.page} of {sales.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchSales(page - 1)}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => fetchSales(page + 1)}
                      disabled={page >= sales.totalPages}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="py-16 text-center">
              <ShoppingBag className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />
              <p className="text-lg font-medium">No sales yet</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Sales will appear here once buyers purchase your beats.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
