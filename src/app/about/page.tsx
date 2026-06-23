import type { Metadata } from "next";
import { Music, Users, Shield, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "About",
  description: "Learn about Trishul Beats — the marketplace connecting producers and artists.",
};

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="mb-12 text-center">
        <h1 className="text-4xl font-bold">About Trishul Beats</h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
          We connect talented producers with artists looking for the perfect beat.
          Browse, preview, license — all in one place.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2">
        {[
          { icon: Music, title: "Quality Beats", desc: "Curated catalog of production-ready beats across every genre." },
          { icon: Users, title: "For Everyone", desc: "Whether you're a buyer looking for beats or a producer selling them." },
          { icon: Shield, title: "Secure Licensing", desc: "Clear license tiers (basic, premium, exclusive) with defined terms." },
          { icon: Zap, title: "Instant Delivery", desc: "Purchase and download immediately. No waiting around." },
        ].map((item) => (
          <Card key={item.title} className="border-border/50 bg-card/80">
            <CardContent className="p-6">
              <item.icon className="mb-3 h-8 w-8 text-primary" />
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
