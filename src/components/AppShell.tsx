"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import BottomPlayer from "@/components/BottomPlayer";
import AttributionCapture from "@/components/AttributionCapture";
import { useAudioActions } from "@/components/AudioPlayerContext";
import { cn } from "@/lib/utils";

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { currentBeat } = useAudioActions();
  const isDashboardRoute =
    pathname === "/dashboard" ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/upload") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/admin");

  const playerOpen = !!currentBeat;

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg focus:ring-2 focus:ring-ring"
      >
        Skip to main content
      </a>
      {!isDashboardRoute && <Navbar />}
      <main
        id="main-content"
        className={cn(
          !isDashboardRoute &&
            "min-h-[calc(100vh-8rem)] bg-[radial-gradient(1200px_500px_at_50%_-120px,var(--gradient-accent),transparent)]",
          !isDashboardRoute && (playerOpen ? "pb-36" : "pb-20"),
        )}
      >
        {children}
      </main>
      {!isDashboardRoute && <Footer />}
      <BottomPlayer />
      <Suspense fallback={null}>
        <AttributionCapture />
      </Suspense>
    </>
  );
}
