import Link from "next/link";
import { Play, Eye, ShoppingCart, IndianRupee } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ATTRIBUTION_SOURCE_LABELS } from "@/lib/attribution";
import type { FunnelAnalyticsDto } from "@/lib/serializers/analytics";

function formatInr(value: number): string {
  return `₹${(value ?? 0).toLocaleString("en-IN")}`;
}

function formatPct(value: number): string {
  return `${((value ?? 0) * 100).toFixed(1)}%`;
}

export function StudioAnalyticsBody({ data }: { data: FunnelAnalyticsDto }) {
  const empty =
    data.funnel.plays === 0 &&
    data.funnel.pdpViews === 0 &&
    data.funnel.checkouts === 0 &&
    data.funnel.paid === 0;

  if (empty) {
    return (
      <Card className="rounded-2xl border-border/50 bg-card/80">
        <CardContent className="p-8 text-center">
          <p className="font-medium">No activity in this range yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Plays, page views, and sales will show up here as listeners find your beats.
          </p>
        </CardContent>
      </Card>
    );
  }

  const funnelCards = [
    { title: "Plays", value: data.funnel.plays, icon: Play },
    { title: "Page views", value: data.funnel.pdpViews, icon: Eye },
    { title: "Checkouts", value: data.funnel.checkouts, icon: ShoppingCart },
    { title: "Paid", value: data.funnel.paid, icon: IndianRupee },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {funnelCards.map((card) => (
          <Card key={card.title} className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                {card.title}
              </CardTitle>
              <card.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{(card.value ?? 0).toLocaleString("en-IN")}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle>By source</CardTitle>
        </CardHeader>
        <CardContent>
          {data.bySource.length === 0 ? (
            <p className="text-sm text-muted-foreground">No sourced traffic in this range.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Source</TableHead>
                  <TableHead className="text-right">Plays</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Earnings</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.bySource.map((row) => (
                  <TableRow key={row.source}>
                    <TableCell>{ATTRIBUTION_SOURCE_LABELS[row.source] ?? row.source}</TableCell>
                    <TableCell className="text-right">{(row.plays ?? 0).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right">{(row.paid ?? 0).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right">{formatInr(row.earnings)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle>By beat</CardTitle>
        </CardHeader>
        <CardContent>
          {data.byBeat.length === 0 ? (
            <p className="text-sm text-muted-foreground">No beat-level stats in this range.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Beat</TableHead>
                  <TableHead className="text-right">Plays</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Conv.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.byBeat.map((row) => (
                  <TableRow key={row.beatId}>
                    <TableCell>
                      <Link href={`/studio/beats/${row.beatId}/edit`} className="hover:text-primary">
                        {row.title ?? "—"}
                      </Link>
                    </TableCell>
                    <TableCell className="text-right">{(row.plays ?? 0).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right">{(row.paid ?? 0).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="text-right">{formatPct(row.conversion)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {data.highPlayZeroSales.length > 0 && (
        <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle>High plays, no sales</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              {data.highPlayZeroSales.map((row) => (
                <li key={row.beatId} className="flex justify-between gap-4">
                  <Link href={`/studio/beats/${row.beatId}/edit`} className="hover:text-primary">
                    {row.title ?? "—"}
                  </Link>
                  <span className="text-muted-foreground">
                    {(row.plays ?? 0).toLocaleString("en-IN")} plays
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
