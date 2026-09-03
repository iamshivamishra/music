import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { beatService } from "@/lib/services/beat.service";
import PackFormClient from "@/features/studio/beat-packs/PackFormClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Studio — New Beat Pack" };

export default async function NewBeatPackPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "producer" && session.user.role !== "admin") {
    redirect("/");
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
      <h2 className="mb-6 text-xl font-bold">Create Beat Pack</h2>
      <PackFormClient producerBeats={producerBeats} />
    </div>
  );
}
