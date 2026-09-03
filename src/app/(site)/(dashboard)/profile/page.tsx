import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { purchaseService } from "@/lib/services/purchase.service";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/stat-card";
import {
  Music,
  ShoppingBag,
  Calendar,
  ArrowRight,
  Pencil,
  ExternalLink,
  IndianRupee,
  Package,
  Award,
  TrendingUp,
  Receipt,
  ShieldCheck,
  FileDown,
} from "lucide-react";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { user, stats, beatMap } = await purchaseService.getProfilePageData(session.user.id);
  if (!user) redirect("/login");

  const displayName = user.displayName || user.name;
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const avatarSrc = user.avatarUrl || user.image;
  const isProducer = user.role === "producer" || user.role === "admin";

  const tierEntries = Object.entries(stats.tierMix);
  const totalTierCount = tierEntries.reduce((sum, [, count]) => sum + count, 0);

  return (
    <div className="page-shell space-y-6">
      {/* Profile header */}
      <Card className="rounded-2xl border-border/50 bg-card/70 shadow-sm backdrop-blur-sm">
        <CardContent className="flex flex-col items-center gap-4 p-6 sm:flex-row">
          <Avatar className="h-20 w-20">
            {avatarSrc && <AvatarImage src={avatarSrc} alt={displayName} />}
            <AvatarFallback className="bg-primary/20 text-2xl text-primary">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-semibold">{displayName}</h1>
            {user.username && (
              <p className="text-sm text-muted-foreground">@{user.username}</p>
            )}
            <p className="text-sm text-muted-foreground">{user.email}</p>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <Badge variant="secondary" className="capitalize">
                {user.role}
              </Badge>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                Member since{" "}
                {new Date(stats.memberSince).toLocaleDateString("en-IN", {
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href="/profile/edit">
                <Pencil className="mr-1.5 h-3.5 w-3.5" />
                Edit Profile
              </Link>
            </Button>
            {isProducer && user.username && (
              <Button asChild variant="ghost" size="sm">
                <Link href={`/producer/${user.username}`}>
                  <ExternalLink className="mr-1.5 h-3.5 w-3.5" />
                  View Public
                </Link>
              </Button>
            )}
            {isProducer && (
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard">
                  Dashboard <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          icon={<IndianRupee className="h-4 w-4" />}
          label="Total Spend"
          value={`₹${stats.totalSpend.toLocaleString("en-IN")}`}
        />
        <StatCard
          icon={<Music className="h-4 w-4" />}
          label="Beats Owned"
          value={stats.beatCount}
        />
        <StatCard
          icon={<Package className="h-4 w-4" />}
          label="Packs Owned"
          value={stats.packCount}
        />
        <StatCard
          icon={<Award className="h-4 w-4" />}
          label="Dominant Tier"
          value={stats.dominantTier ? stats.dominantTier.charAt(0).toUpperCase() + stats.dominantTier.slice(1) : "N/A"}
          description={stats.dominantTier ? `Most of your licenses` : "No purchases yet"}
        />
      </div>

      {/* License mix */}
      {tierEntries.length > 0 && (
        <Card className="rounded-2xl border-border/50 bg-card/70 shadow-sm backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-5 w-5 text-primary" />
              License Mix
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tierEntries.map(([tier, count]) => {
              const pct = totalTierCount > 0 ? Math.round((count / totalTierCount) * 100) : 0;
              const barColor =
                tier === "premium"
                  ? "bg-amber-500"
                  : tier === "unlimited"
                    ? "bg-violet-500"
                    : "bg-primary";
              return (
                <div key={tier}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="capitalize">{tier}</span>
                    <span className="text-muted-foreground">
                      {count} ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className={`h-full rounded-full ${barColor} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Recent purchases (preview — last 3) */}
      <Card className="rounded-2xl border-border/50 bg-card/70 shadow-sm backdrop-blur-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingBag className="h-5 w-5 text-primary" />
            Recent Purchases
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/profile/library">
              View all in My Library <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {stats.recentPurchases.length > 0 ? (
            <div className="space-y-3">
              {stats.recentPurchases.slice(0, 3).map((purchase) => {
                const beat = purchase.beatId
                  ? beatMap.get(purchase.beatId.toString())
                  : null;
                const isPack = !!purchase.packId;
                return (
                  <div
                    key={purchase._id.toString()}
                    className="flex items-center justify-between rounded-lg border border-border/30 bg-background/50 p-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                        {isPack ? (
                          <Package className="h-5 w-5 text-primary" />
                        ) : (
                          <Music className="h-5 w-5 text-primary" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          {isPack ? "Beat Pack" : beat?.title || "Unknown Beat"}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Badge variant="outline" className="text-xs capitalize">
                            {purchase.licenseType || purchase.packTier || "—"}
                          </Badge>
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {new Date(purchase.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold">₹{purchase.amount}</p>
                      <Button asChild variant="ghost" size="icon" className="h-8 w-8" aria-label="Download license PDF">
                        <a href={`/api/purchases/${purchase._id.toString()}/license-pdf`} target="_blank" rel="noopener noreferrer">
                          <FileDown className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
              <ShoppingBag className="mx-auto mb-2 h-8 w-8" />
              <p>No purchases yet.</p>
              <Button asChild variant="link" className="mt-2">
                <Link href="/beats">Browse Beats</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick links */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/profile/library"
          className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/70 p-4 backdrop-blur-sm transition-colors hover:bg-accent"
        >
          <Music className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">My Library</p>
            <p className="text-xs text-muted-foreground">All purchases &amp; downloads</p>
          </div>
        </Link>
        <Link
          href="/profile/transactions"
          className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/70 p-4 backdrop-blur-sm transition-colors hover:bg-accent"
        >
          <Receipt className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">Transactions</p>
            <p className="text-xs text-muted-foreground">Full order history</p>
          </div>
        </Link>
        <Link
          href="/profile/verify-license"
          className="flex items-center gap-3 rounded-xl border border-border/50 bg-card/70 p-4 backdrop-blur-sm transition-colors hover:bg-accent"
        >
          <ShieldCheck className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-medium">Verify License</p>
            <p className="text-xs text-muted-foreground">Look up your certificates</p>
          </div>
        </Link>
      </div>
    </div>
  );
}
