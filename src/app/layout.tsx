import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import { cn } from "@/lib/utils";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export const metadata: Metadata = {
  title: {
    default: "Trishul Beats — Beat Marketplace",
    template: "%s | Trishul Beats",
  },
  description:
    "Discover and license high-quality beats from talented producers. Find the perfect beat for your next track on Trishul Beats.",
  keywords: [
    "beats", "music production", "beat marketplace", "buy beats",
    "hip hop beats", "license beats", "instrumental beats", "rap beats",
  ],
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  openGraph: {
    type: "website",
    siteName: "Trishul Beats",
    title: "Trishul Beats — Beat Marketplace",
    description: "Discover and license high-quality beats from talented producers.",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
    title: "Trishul Beats — Beat Marketplace",
    description: "Discover and license high-quality beats from talented producers.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("font-sans antialiased", geist.variable)}
    >
      <body className="min-h-screen bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
