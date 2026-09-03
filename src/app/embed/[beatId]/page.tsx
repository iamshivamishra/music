import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { embedService } from "@/lib/services/embed.service";
import EmbedPlayerClient from "./EmbedPlayerClient";

interface Props {
  params: Promise<{ beatId: string }>;
  searchParams: Promise<{ theme?: string; size?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { beatId } = await params;
  try {
    const data = await embedService.getBeatData(beatId);
    return {
      title: `${data.title} — Trishul Beats`,
      robots: { index: false, follow: false },
    };
  } catch {
    return { title: "Trishul Beats", robots: { index: false, follow: false } };
  }
}

export default async function EmbedBeatPage({ params, searchParams }: Props) {
  const { beatId } = await params;
  const { theme = "dark", size = "full" } = await searchParams;

  const data = await embedService.getBeatData(beatId).catch(() => null);
  if (!data) notFound();

  return (
    <EmbedPlayerClient
      beat={data}
      price={data.price}
      pdpUrl={data.pdpUrl}
      theme={theme === "light" ? "light" : "dark"}
      size={size === "compact" ? "compact" : "full"}
    />
  );
}
