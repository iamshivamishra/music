import type { Metadata } from "next";
import { Music, Users, Shield, Zap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { FaqAccordion } from "@/components/ui/FaqAccordion";

const FAQ_ITEMS = [
  {
    question: "What license tiers are available?",
    answer:
      "We offer Basic and Premium tiers. Basic covers personal projects and social media. Premium adds commercial rights for streaming platforms with higher distribution limits.",
  },
  {
    question: "How is the beat delivered after purchase?",
    answer:
      "Instantly! After payment, you get immediate access to download the WAV, MP3, and stems (where available) directly from your library.",
  },
  {
    question: "Can I get a refund?",
    answer:
      "Because beats are digital goods delivered instantly, we generally cannot offer refunds. However, if you experience a technical issue with your download, please contact us and we'll help resolve it.",
  },
  {
    question: "Do I need to credit the producer?",
    answer:
      "Yes — both Basic and Premium licenses require producer credit (e.g., 'Prod. by [name]'). It's part of the license terms and helps support the producer.",
  },
  {
    question: "What are beat packs?",
    answer:
      "Beat packs are curated bundles of beats offered at a discounted price. They're a great way to stock up on production-ready beats across a genre or style.",
  },
  {
    question: "How do I become a producer on Trishul Beats?",
    answer:
      "Sign up with a producer account, complete your profile, and start uploading beats through the Studio dashboard. Your beats go live after a quick quality check.",
  },
  {
    question: "What file formats are included?",
    answer:
      "All purchases include high-quality WAV and MP3 files. Premium licenses also include track stems for mixing and remixing.",
  },
  {
    question: "How do I contact support?",
    answer:
      "Visit our Contact page to send us a message, or email us directly. We typically respond within 24 hours.",
  },
];

export const metadata: Metadata = {
  title: "About",
  description: "Learn about Trishul Beats — the marketplace connecting producers and artists.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <div className="page-shell max-w-5xl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="page-header text-center">
        <h1 className="text-3xl font-semibold sm:text-4xl">About Trishul Beats</h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-muted-foreground sm:text-lg">
          We connect talented producers with artists looking for the perfect beat.
          Browse, preview, license — all in one place.
        </p>
      </div>

      <div className="scroll-reveal grid gap-6 sm:grid-cols-2">
        {[
          { icon: Music, title: "Quality Beats", desc: "Curated catalog of production-ready beats across every genre." },
          { icon: Users, title: "For Everyone", desc: "Whether you're a buyer looking for beats or a producer selling them." },
          { icon: Shield, title: "Secure Licensing", desc: "Clear license tiers with defined terms." },
          { icon: Zap, title: "Instant Delivery", desc: "Purchase and download immediately. No waiting around." },
        ].map((item) => (
          <Card key={item.title} className="border-border/60 bg-card/80 shadow-sm">
            <CardContent className="p-6">
              <item.icon className="mb-3 h-7 w-7 text-primary" />
              <h2 className="text-lg font-semibold">{item.title}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.desc}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <section className="scroll-reveal mt-16">
        <h2 className="mb-6 text-center text-2xl font-semibold">Frequently Asked Questions</h2>
        <FaqAccordion items={FAQ_ITEMS} />
      </section>
    </div>
  );
}
