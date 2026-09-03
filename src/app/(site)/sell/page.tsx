import Link from "next/link";
import { Suspense } from "react";
import type { Metadata } from "next";
import {
  ArrowRight,
  IndianRupee,
  Shield,
  Zap,
  BarChart3,
  UserPlus,
  Upload,
  Wallet,
  X,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import InviteBanner from "./InviteBanner";
import WaitlistForm from "./WaitlistForm";

export const metadata: Metadata = {
  title: "Sell Your Beats | Trishul Beats",
  description:
    "Sell beats to Indian artists. INR checkout, real licenses, instant delivery, analytics dashboard.",
  alternates: { canonical: "/sell" },
};

const VALUE_PROPS = [
  {
    icon: IndianRupee,
    title: "INR Checkout",
    desc: "Accept payments in Indian Rupees via UPI, cards, and net banking.",
  },
  {
    icon: Shield,
    title: "Real Licenses",
    desc: "Auto-generated license agreements protect you and your buyers.",
  },
  {
    icon: Zap,
    title: "Instant Delivery",
    desc: "Buyers get instant access to WAV, MP3, and stems after purchase.",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    desc: "Track revenue, sales, plays, and top-performing beats in real time.",
  },
];

const STEPS = [
  {
    icon: UserPlus,
    title: "Sign Up",
    desc: "Create your free producer account in under a minute.",
  },
  {
    icon: Upload,
    title: "Upload Beats",
    desc: "Add tagged previews, master WAVs, and set your license prices.",
  },
  {
    icon: Wallet,
    title: "Get Paid",
    desc: "Artists license your beats. You earn on every sale.",
  },
];

const COMPARISON_ROWS = [
  {
    feature: "Discoverability",
    dm: "Limited to your followers",
    trishul: "Reach artists searching by genre, mood, and BPM",
  },
  {
    feature: "Licensing",
    dm: "No formal agreement",
    trishul: "Auto-generated license PDFs on every sale",
  },
  {
    feature: "Payments",
    dm: "Manual bank transfers, chasing payments",
    trishul: "Secure INR checkout via Razorpay — UPI, cards, net banking",
  },
  {
    feature: "Analytics",
    dm: "No visibility into performance",
    trishul: "Real-time dashboard with plays, sales, and revenue",
  },
  {
    feature: "Delivery",
    dm: "Manually sending files over DMs",
    trishul: "Instant automated delivery of WAV, MP3, and stems",
  },
];

export default async function SellPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const { invite } = await searchParams;
  const signupHref = invite
    ? `/signup?role=producer&invite=${encodeURIComponent(invite)}`
    : "/signup?role=producer";
  return (
    <div>
      <Suspense>
        <InviteBanner />
      </Suspense>
      {/* Hero */}
      <section
        aria-labelledby="sell-hero-heading"
        className="relative overflow-hidden border-b border-border/30"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--gradient-accent),transparent_70%)]" />
        <div className="app-container relative py-24 sm:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="secondary" className="mb-4">
              For Producers
            </Badge>
            <h1
              id="sell-hero-heading"
              className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl"
            >
              Sell beats to Indian artists.
              <br />
              <span className="text-primary">Get paid in rupees.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-lg text-lg text-muted-foreground">
              Trishul Beats is India&apos;s beat marketplace. Upload your
              catalog, set your prices, and reach thousands of artists looking
              for their next hit.
            </p>
            <div className="mt-8">
              <Button asChild size="lg" className="shimmer-cta px-8">
                <Link href={signupHref}>
                  Start Selling <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Value Props */}
      <section
        aria-labelledby="value-props-heading"
        className="scroll-reveal app-container py-16"
      >
        <h2 id="value-props-heading" className="sr-only">
          Why sell on Trishul Beats
        </h2>
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {VALUE_PROPS.map((prop) => (
            <div
              key={prop.title}
              className="rounded-xl border border-border/50 bg-card/50 p-6"
            >
              <prop.icon className="mb-3 h-8 w-8 text-primary" />
              <h3 className="text-lg font-semibold">{prop.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{prop.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section
        aria-labelledby="how-it-works-heading"
        className="scroll-reveal app-container py-16"
      >
        <h2
          id="how-it-works-heading"
          className="mb-10 text-center text-3xl font-bold"
        >
          How It Works
        </h2>
        <div className="grid gap-8 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step.title} className="text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <step.icon className="h-6 w-6 text-primary" />
              </div>
              <div className="mb-2 text-xs font-bold uppercase tracking-wider text-primary">
                Step {i + 1}
              </div>
              <h3 className="mb-1 text-lg font-semibold">{step.title}</h3>
              <p className="text-sm text-muted-foreground">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison Table */}
      <section
        aria-labelledby="comparison-heading"
        className="scroll-reveal app-container py-16"
      >
        <h2
          id="comparison-heading"
          className="mb-10 text-center text-3xl font-bold"
        >
          Why Trishul vs Instagram DMs
        </h2>
        <Card className="mx-auto max-w-3xl overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground sm:px-6"
                    >
                      Feature
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-muted-foreground sm:px-6"
                    >
                      Instagram DMs
                    </th>
                    <th
                      scope="col"
                      className="px-4 py-3 text-left font-medium text-primary sm:px-6"
                    >
                      Trishul Beats
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {COMPARISON_ROWS.map((row) => (
                    <tr
                      key={row.feature}
                      className="border-b border-border/30 last:border-b-0"
                    >
                      <td className="px-4 py-3 font-medium sm:px-6">
                        {row.feature}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground sm:px-6">
                        <span className="flex items-start gap-2">
                          <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                          {row.dm}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-primary sm:px-6">
                        <span className="flex items-start gap-2">
                          <Check className="mt-0.5 h-4 w-4 shrink-0" />
                          {row.trishul}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Pricing */}
      <section
        aria-labelledby="pricing-heading"
        className="scroll-reveal app-container py-16"
      >
        <div className="mx-auto max-w-lg text-center">
          <Card className="border-primary/20">
            <CardContent className="px-8 py-10">
              <h2
                id="pricing-heading"
                className="text-3xl font-bold text-primary"
              >
                Free to list
              </h2>
              <p className="mt-4 text-muted-foreground">
                We take a small platform fee only when you make a sale. No
                monthly charges, no hidden costs.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Waitlist */}
      <section
        id="waitlist"
        aria-labelledby="waitlist-heading"
        className="scroll-reveal app-container py-16"
      >
        <div className="mx-auto max-w-lg text-center">
          <h2 id="waitlist-heading" className="text-3xl font-semibold">
            Join the producer waitlist
          </h2>
          <p className="mt-3 text-muted-foreground">
            Not ready to sign up, or your invitation expired? Leave your details
            and we&apos;ll invite you when a founding spot opens.
          </p>
          <div className="mt-8">
            <WaitlistForm />
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section
        aria-labelledby="bottom-cta-heading"
        className="border-t border-border/30 bg-card/30"
      >
        <div className="app-container py-16 text-center">
          <h2
            id="bottom-cta-heading"
            className="text-3xl font-semibold"
          >
            Ready to start earning from your beats?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Join producers already selling on Trishul Beats. It takes less than a
            minute to get started.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Button asChild size="lg" className="shimmer-cta px-8">
              <Link href={signupHref}>
                Start Selling <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href="/beats">Browse the Marketplace</Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
