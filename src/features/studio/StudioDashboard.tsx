"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  IndianRupee, TrendingUp, Music, BarChart3,
  ArrowRight, Eye, ShoppingBag, Upload, Home, Crown, AlertTriangle,
  MessageCircle, X, RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import MiniChart from "@/components/MiniChart";

import FirstUploadNudge from "@/features/studio/FirstUploadNudge";
import EmbedCodeGenerator from "@/components/EmbedCodeGenerator";

interface FoundingInfo {
  producerTier: "founding";
  platformFeeOverride: number | null;
  feePercent: number;
  producerTierExpiresAt: string | null;
}

interface Analytics {
  totalEarnings: number;
  totalSales: number;
  totalPlays: number;
  totalEmbedViews: number;
  username: string | null;
  beats: { total: number; published: number; drafts: number };
  monthlyData: { month: string; revenue: number; sales: number }[];
  topBeats: { beatId: string; title: string; revenue: number; sales: number }[];
  foundingInfo: FoundingInfo | null;
  showWhatsAppNudge?: boolean;
  pendingCollabInvites?: number;
}

function StatCard({
  title,
  value,
  icon: Icon,
  subtitle,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  subtitle?: string;
}) {
  return (
    <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-bold">{value}</p>
        {subtitle && (
          <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardContent>
    </Card>
  );
}

function DashboardSkeleton() {
  return (
    <div className="page-shell">
      <Skeleton className="mb-8 h-10 w-64" />
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-72 rounded-xl" />
        <Skeleton className="h-72 rounded-xl" />
      </div>
    </div>
  );
}

export default function StudioDashboard() {
  const [data, setData] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [whatsAppNudgeDismissed, setWhatsAppNudgeDismissed] = useState(false);
  const [error, setError] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch("/api/studio/analytics");
      if (res.ok) {
        setData(await res.json());
      } else {
        setError(true);
      }
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) return <DashboardSkeleton />;

  if (error || !data) {
    return (
      <div className="page-shell">
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <AlertTriangle className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium">Failed to load studio analytics</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Something went wrong. Please try again.
          </p>
          <Button variant="outline" size="sm" className="mt-4" onClick={fetchData}>
            <RefreshCw className="mr-1.5 h-4 w-4" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (data.beats.total === 0) {
    return <FirstUploadNudge />;
  }

  const revenueData = data.monthlyData.map((d) => ({
    label: d.month,
    value: d.revenue,
  }));

  const salesData = data.monthlyData.map((d) => ({
    label: d.month,
    value: d.sales,
  }));

  const currentMonth = data.monthlyData[data.monthlyData.length - 1];
  const prevMonth =
    data.monthlyData.length > 1
      ? data.monthlyData[data.monthlyData.length - 2]
      : null;

  const revenueChange =
    prevMonth && prevMonth.revenue > 0
      ? Math.round(
          ((currentMonth.revenue - prevMonth.revenue) / prevMonth.revenue) * 100
        )
      : null;

  return (
    <div className="page-shell">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="page-title">Studio</h1>
          <p className="text-muted-foreground">
            Track your performance and manage your catalog. Earnings include collab shares from other people&apos;s beats.
          </p>
        </div>
       <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link href="/">
              <Home className="mr-1.5 h-4 w-4" />
              Home
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/studio/beats">
              <Music className="mr-1.5 h-4 w-4" />
              My Beats
            </Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/upload">
              <Upload className="mr-1.5 h-4 w-4" />
              Upload
            </Link>
          </Button>
        </div>
      </div>

      {!!data.pendingCollabInvites && data.pendingCollabInvites > 0 && (
        <div className="mb-6 rounded-2xl border border-primary/25 bg-primary/10 px-4 py-3 text-sm">
          You have {data.pendingCollabInvites} collab{" "}
          {data.pendingCollabInvites === 1 ? "invite" : "invites"} waiting.{" "}
          <Link href="/studio/collabs" className="font-medium text-primary hover:underline">
            Review invites
          </Link>
        </div>
      )}

      {/* Founding Producer Banner */}
      {data.foundingInfo && <FoundingBanner info={data.foundingInfo} />}

      {/* WhatsApp Nudge Banner */}
      {data.showWhatsAppNudge && !whatsAppNudgeDismissed && (
        <div className="mb-8 flex items-center gap-3 rounded-xl border border-green-600/20 bg-green-600/5 px-5 py-4">
          <MessageCircle className="h-5 w-5 shrink-0 text-green-400" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-green-400">
              Get sale alerts on WhatsApp
            </p>
            <p className="mt-0.5 text-sm text-green-400/70">
              Turn on instant WhatsApp notifications so you know the second someone buys your beat.
            </p>
          </div>
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/profile/edit#notifications">Turn On</Link>
          </Button>
          <button
            onClick={() => setWhatsAppNudgeDismissed(true)}
            className="ml-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label="Dismiss WhatsApp notification banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Stat Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value={`₹${data.totalEarnings.toLocaleString()}`}
          icon={IndianRupee}
          subtitle={
            revenueChange !== null
              ? `${revenueChange >= 0 ? "+" : ""}${revenueChange}% from last month`
              : "This month: ₹" + currentMonth.revenue.toLocaleString()
          }
        />
        <StatCard
          title="Total Sales"
          value={data.totalSales.toLocaleString()}
          icon={ShoppingBag}
          subtitle={`This month: ${currentMonth.sales}`}
        />
        <StatCard
          title="Total Plays"
          value={data.totalPlays.toLocaleString()}
          icon={Eye}
          subtitle={`${(data.totalEmbedViews ?? 0).toLocaleString()} embed views`}
        />
        <StatCard
          title="Beats"
          value={data.beats.total.toString()}
          icon={Music}
          subtitle={`${data.beats.published} published, ${data.beats.drafts} drafts`}
        />
      </div>

      {/* Charts */}
      <div className="mb-8 grid gap-6 lg:grid-cols-2">
        <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Revenue Trend</CardTitle>
            <CardDescription>Monthly revenue over the last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <MiniChart
              data={revenueData}
              color="hsl(142, 71%, 45%)"
              height={200}
              type="line"
            />
          </CardContent>
        </Card>

        <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Sales Trend</CardTitle>
            <CardDescription>Monthly sales count over the last 12 months</CardDescription>
          </CardHeader>
          <CardContent>
            <MiniChart
              data={salesData}
              color="hsl(var(--primary))"
              height={200}
              type="bar"
            />
          </CardContent>
        </Card>
      </div>

      {/* Top Beats & Quick Links */}
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Top Beats */}
        <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base">Top Performing Beats</CardTitle>
              <CardDescription>By revenue</CardDescription>
            </div>
            <Button asChild variant="ghost" size="sm">
              <Link href="/studio/sales">
                View All Sales
                <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.topBeats.length > 0 ? (
              <div className="space-y-3">
                {data.topBeats.map((beat, i) => (
                  <div
                    key={beat.beatId}
                    className="flex items-center gap-3 rounded-lg p-2 hover:bg-accent/50"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <Link
                        href={`/studio/beats/${beat.beatId}/edit`}
                        className="text-sm font-medium hover:text-primary truncate block"
                      >
                        {beat.title}
                      </Link>
                      <p className="text-xs text-muted-foreground">
                        {beat.sales} {beat.sales === 1 ? "sale" : "sales"}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-bold text-green-400">
                      ₹{beat.revenue.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No sales yet. Start promoting your beats!
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="space-y-4">
          <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button asChild variant="outline" className="w-full justify-start" size="sm">
                <Link href="/upload">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload New Beat
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start" size="sm">
                <Link href="/studio/beats">
                  <Music className="mr-2 h-4 w-4" />
                  Manage Beats
                </Link>
              </Button>
              {data.username && (
                <EmbedCodeGenerator
                  username={data.username}
                  beatTitle={data.username}
                  triggerLabel="Get Embed Code"
                  triggerClassName="w-full justify-start"
                />
              )}
              <Button asChild variant="outline" className="w-full justify-start" size="sm">
                <Link href="/studio/sales">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  View Sales History
                </Link>
              </Button>
              <Button asChild variant="outline" className="w-full justify-start" size="sm">
                <Link href="/profile/edit">
                  <BarChart3 className="mr-2 h-4 w-4" />
                  Edit Profile
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Current Month Summary */}
          <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base">This Month</CardTitle>
              <CardDescription>{currentMonth.month}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Revenue</span>
                <span className="font-bold text-green-400">
                  ₹{currentMonth.revenue.toLocaleString()}
                </span>
              </div>
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sales</span>
                <span className="font-bold">{currentMonth.sales}</span>
              </div>
              {revenueChange !== null && (
                <>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">vs Last Month</span>
                    <Badge
                      variant={revenueChange >= 0 ? "secondary" : "destructive"}
                      className="text-xs"
                    >
                      {revenueChange >= 0 ? "+" : ""}
                      {revenueChange}%
                    </Badge>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function FoundingBanner({ info }: { info: FoundingInfo }) {
  const expiresAt = info.producerTierExpiresAt
    ? new Date(info.producerTierExpiresAt)
    : null;
  const now = new Date();
  const isExpired = expiresAt && expiresAt <= now;
  if (isExpired) return null;

  const daysLeft = expiresAt
    ? Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const expiringSoon = daysLeft !== null && daysLeft <= 30;
  const feePercent = info.feePercent;
  const dateLabel = expiresAt
    ? expiresAt.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : null;
  const feeLabel =
    feePercent === 0
      ? `0% (Founding benefit${dateLabel ? ` — expires ${dateLabel}` : ""})`
      : `${feePercent}% platform fee${dateLabel ? ` until ${dateLabel}` : ""}`;

  return (
    <div
      className={`mb-8 flex items-center gap-3 rounded-xl border px-5 py-4 ${
        expiringSoon
          ? "border-amber-500/40 bg-amber-500/10"
          : "border-amber-500/20 bg-amber-500/5"
      }`}
    >
      {expiringSoon ? (
        <AlertTriangle className="h-5 w-5 shrink-0 text-amber-400" />
      ) : (
        <Crown className="h-5 w-5 shrink-0 text-amber-400" />
      )}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-amber-400">
          Founding Producer — {feeLabel}
        </p>
        {expiringSoon && daysLeft !== null && (
          <p className="mt-0.5 text-sm text-amber-400/70">
            Your founding period ends in {daysLeft} {daysLeft === 1 ? "day" : "days"}.
            Standard platform fees will apply after that.
          </p>
        )}
      </div>
    </div>
  );
}
