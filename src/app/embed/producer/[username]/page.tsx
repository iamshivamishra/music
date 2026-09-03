import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { embedService } from "@/lib/services/embed.service";
import ProducerEmbedClient from "./ProducerEmbedClient";

interface Props {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ theme?: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  try {
    const data = await embedService.getProducerCatalog(username);
    return {
      title: `${data.name} — Trishul Beats`,
      robots: { index: false, follow: false },
    };
  } catch {
    return { title: "Trishul Beats", robots: { index: false, follow: false } };
  }
}

export default async function ProducerEmbedPage({ params, searchParams }: Props) {
  const { username } = await params;
  const { theme = "dark" } = await searchParams;

  const data = await embedService.getProducerCatalog(username).catch(() => null);
  if (!data) notFound();

  return (
    <ProducerEmbedClient
      producer={{
        name: data.name,
        username: data.username,
        avatarUrl: data.avatarUrl,
      }}
      beats={data.beats}
      profileUrl={data.profileUrl}
      homeUrl={data.homeUrl}
      theme={theme === "light" ? "light" : "dark"}
    />
  );
}
