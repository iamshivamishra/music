import Link from "next/link";
import {
  ArrowRight,
  Search,
  ShoppingCart,
  Download,
  Play,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BeatQueueGrid from "@/features/beats/BeatQueueGrid";
import { GenreChipGroup } from "@/features/beats/GenreChipGroup";
import SocialProofStrip from "@/features/beats/SocialProofStrip";
import { homeService } from "@/lib/services/home.service";

export const revalidate = 120;

const STEPS = [
  {
    icon: Search,
    title: "Browse & Preview",
    desc: "Explore beats across genres. Preview every track for free — no sign-up needed.",
  },
  {
    icon: ShoppingCart,
    title: "License Instantly",
    desc: "Pick Basic, Premium, or Unlimited — clear pricing, no hidden fees.",
  },
  {
    icon: Download,
    title: "Download & Create",
    desc: "Get WAV, MP3, and stems immediately. Your next track starts now.",
  },
];

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K+`;
  return `${n}+`;
}

function SectionHeading({
  id,
  title,
  subtitle,
  href,
  className,
}: {
  id: string;
  title: string;
  subtitle?: string;
  href: string;
  className?: string;
}) {
  return (
    <div className={`mb-8 flex items-end justify-between gap-4 ${className ?? ""}`}>
      <div>
        <h2 id={id} className="text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        )}
      </div>
      <Button asChild variant="ghost" size="sm" className="shrink-0">
        <Link href={href}>
          See all <ArrowRight className="ml-1 h-4 w-4" />
        </Link>
      </Button>
    </div>
  );
}

export default async function HomePage() {
  const {
    recentBeats: recentWithPrices,
    trendingBeats: trendingWithPrices,
    stats,
    foundingProducers,
  } = await homeService.getHomepageData();

  return (
    <div>
      {/* ─── HERO ─── */}
      <section className="relative isolate overflow-hidden border-b border-border/30">
        {/* Background glow — brand-green, not purple */}
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          aria-hidden="true"
        >
          <div className="absolute left-1/2 top-0 h-[480px] w-[800px] -translate-x-1/2 -translate-y-1/4 rounded-full bg-primary/8 blur-[120px]" />
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
        </div>

        {/* Subtle beams */}
        <div className="hero-beam top-[20%] left-0" aria-hidden="true" />
        <div
          className="hero-beam top-[55%] left-0"
          style={{ animationDelay: "4s" }}
          aria-hidden="true"
        />

        <div className="app-container relative py-20 sm:py-28 lg:py-36">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="hero-reveal mb-5 gap-1.5">
              <Play className="h-3 w-3 fill-primary text-primary" />
              Beat Marketplace
            </Badge>

            <h1 className="hero-reveal-delay-1 text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
              Your next hit
              <br />
              <span className="bg-gradient-to-r from-primary to-progress-end bg-clip-text text-transparent">
                starts here.
              </span>
            </h1>

            <p className="hero-reveal-delay-2 mx-auto mt-6 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              High-quality beats from real producers.
              Preview free, license instantly, and start creating today.
            </p>

            <div className="hero-reveal-delay-2 mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button asChild size="lg" className="shimmer-cta px-8 shadow-lg shadow-primary/20">
                <Link href="/beats">
                  Browse Beats <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/sell">Start Selling</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── ANIMATED STATS ─── */}
      <SocialProofStrip
        beatCount={stats.beatCount}
        producerCount={stats.producerCount}
        genreCount={stats.genreCount}
      />

      {/* ─── TRENDING ─── */}
      {trendingWithPrices.length > 0 && (
        <section className="relative" aria-labelledby="trending-heading">
          {/* Spotlight glow behind trending section */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-96 bg-[radial-gradient(ellipse_60%_50%_at_50%_0%,oklch(0.78_0.20_145_/_0.06),transparent)]"
            aria-hidden="true"
          />
          <div className="app-container py-16 sm:py-20">
            <SectionHeading
              id="trending-heading"
              title="Trending Now"
              subtitle="The beats everyone is listening to this week"
              href="/charts"
            />
            <BeatQueueGrid
              items={trendingWithPrices}
              className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
            />
          </div>
        </section>
      )}

      {/* ─── RECENTLY ADDED ─── */}
      {recentWithPrices.length > 0 && (
        <section className="app-container pb-16" aria-labelledby="recent-heading">
          <SectionHeading
            id="recent-heading"
            title="New This Week"
            subtitle="Published in the last 7 days"
            href="/charts"
          />
          <BeatQueueGrid
            items={recentWithPrices}
            className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4"
          />
        </section>
      )}

      {/* ─── BROWSE BY GENRE ─── */}
      <section
        className="border-y border-border/30 bg-card/20"
        aria-labelledby="genres-heading"
      >
        <div className="app-container py-16 sm:py-20">
          <SectionHeading
            id="genres-heading"
            title="Browse by Genre"
            subtitle="Find your sound"
            href="/beats"
          />
          <GenreChipGroup />
        </div>
      </section>

      {/* ─── HOW IT WORKS ─── */}
      <section className="app-container py-16 sm:py-20">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-12 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
            How It Works
          </h2>
          <div className="relative grid gap-0 sm:grid-cols-3 sm:gap-8">
            {/* Connecting line (desktop) */}
            <div
              className="pointer-events-none absolute left-0 right-0 top-7 hidden h-px bg-border/60 sm:block"
              aria-hidden="true"
            />
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="scroll-reveal group relative flex gap-4 py-4 sm:flex-col sm:items-center sm:gap-0 sm:py-0 sm:text-center"
              >
                {/* Step number circle */}
                <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-primary/30 bg-background text-lg font-bold text-primary transition-colors group-hover:border-primary group-hover:bg-primary/10">
                  {i + 1}
                </div>
                <div className="sm:mt-5">
                  <h3 className="text-base font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {step.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FOUNDING PRODUCERS ─── */}
      {foundingProducers.length > 0 && (
        <section className="border-t border-border/30 bg-card/20">
          <div className="app-container py-16 sm:py-20">
            <h2 className="mb-2 text-center text-2xl font-semibold tracking-tight sm:text-3xl">
              Founding Producers
            </h2>
            <p className="mx-auto mb-10 max-w-md text-center text-sm text-muted-foreground">
              The early creators building the Trishul Beats catalog.
            </p>
            <div className="flex flex-wrap items-stretch justify-center gap-4">
              {foundingProducers.map((p) => (
                <Link
                  key={p.username}
                  href={`/producer/${p.username}`}
                  className="group flex w-32 flex-col items-center gap-3 rounded-xl border border-border/50 bg-card px-4 py-5 transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary ring-2 ring-primary/20 transition-all group-hover:ring-primary/40">
                    {p.avatarUrl ? (
                      <img
                        src={p.avatarUrl}
                        alt={p.name}
                        className="h-14 w-14 rounded-full object-cover"
                      />
                    ) : (
                      p.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  <span className="text-center text-sm font-medium transition-colors group-hover:text-primary">
                    {p.name}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {p.beatCount} {p.beatCount === 1 ? "beat" : "beats"}
                  </span>
                  <Badge variant="secondary" className="text-[10px]">
                    Founding
                  </Badge>
                </Link>
              ))}
            </div>
            <div className="mt-8 text-center">
              <Button asChild variant="outline" size="sm">
                <Link href="/sell">Become a Producer</Link>
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* ─── FINAL CTA ─── */}
      <section className="relative isolate overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 -z-10"
          aria-hidden="true"
        >
          <div className="absolute left-1/2 top-1/2 h-[400px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/6 blur-[100px]" />
        </div>
        <div className="app-container py-20 text-center sm:py-24">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Ready to find your sound?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-muted-foreground">
            {formatCount(stats.beatCount)} beats from{" "}
            {formatCount(stats.producerCount)} producers — all waiting for you.
          </p>
          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="shimmer-cta px-8 shadow-lg shadow-primary/20">
              <Link href="/signup">Get Started Free</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/beats">Browse Beats</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
