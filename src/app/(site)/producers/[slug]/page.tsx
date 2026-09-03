import { redirect, notFound } from "next/navigation";
import { producerService } from "@/lib/services/producer.service";

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

export default async function LegacyProducerRedirect({ params }: Props) {
  const { slug } = await params;
  const username = await producerService.resolveUsernameForRedirect(slug);
  if (!username) notFound();

  redirect(`/producer/${username}`);
}
