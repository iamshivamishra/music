import type { Metadata } from "next";
import MarketplaceClient from "./MarketplaceClient";

export const metadata: Metadata = {
  title: "Marketplace — Trishul Beats",
  description:
    "Browse and license high-quality beats from independent producers. Search by title, producer, genre, mood, BPM, and price.",
  openGraph: {
    title: "Beat Marketplace — Trishul Beats",
    description: "Discover and license beats from top producers.",
  },
};

export default function MarketplacePage() {
  return <MarketplaceClient />;
}
