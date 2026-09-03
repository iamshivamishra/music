import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { packService } from "@/lib/services/pack.service";
import { beatService } from "@/lib/services/beat.service";
import { serializeLean } from "@/lib/serializers/lean";
import PackFormClient from "@/features/studio/beat-packs/PackFormClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Studio — Edit Beat Pack" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditBeatPackPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "producer" && session.user.role !== "admin") {
    redirect("/");
  }

  const { id } = await params;
  let pack;
  try {
    pack = await packService.getById(id);
  } catch {
    notFound();
  }

  if (
    pack.producerId.toString() !== session.user.id &&
    session.user.role !== "admin"
  ) {
    redirect("/studio/beat-packs");
  }

  const result = await beatService.listByProducer(session.user.id, undefined, 1, 100);
  const producerBeats = result.data.map((b) => ({
    _id: b._id.toString(),
    title: b.title,
    genre: b.genre,
    coverUrl: b.coverUrl,
  }));

  return (
    <div className="p-4 sm:p-6">
      <h2 className="mb-6 text-xl font-bold">Edit Beat Pack</h2>
      <PackFormClient
        producerBeats={producerBeats}
        existingPack={serializeLean(pack)}
      />
    </div>
  );
}
