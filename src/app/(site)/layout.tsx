import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import Providers from "@/components/Providers";
import AppShell from "@/components/AppShell";
import ErrorReporter from "@/components/ErrorReporter";

export const metadata: Metadata = {
  alternates: {
    canonical: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  },
};

export default function SiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "Trishul Beats",
    url: appUrl,
    description: "Discover and license high-quality beats from talented producers.",
    potentialAction: {
      "@type": "SearchAction",
      target: `${appUrl}/beats?search={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <Providers>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {process.env.NEXT_PUBLIC_GA_ID && (
        <>
          <script
            async
            src={`https://www.googletagmanager.com/gtag/js?id=${process.env.NEXT_PUBLIC_GA_ID}`}
          />
          <script
            dangerouslySetInnerHTML={{
              __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${process.env.NEXT_PUBLIC_GA_ID}');`,
            }}
          />
        </>
      )}
      <AppShell>{children}</AppShell>
      <Toaster richColors position="top-right" />
      <ErrorReporter />
    </Providers>
  );
}
