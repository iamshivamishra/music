import type { Metadata } from "next";
import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { beatService } from "@/lib/services/beat.service";
import { serializeLean } from "@/lib/serializers/lean";
import EditBeatForm from "@/features/studio/beats/EditBeatForm";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Edit Beat" };

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditBeatPage({ params }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "producer" && session.user.role !== "admin") {
    redirect("/");
  }

  const { id } = await params;

  let data;
  try {
    data = await beatService.getEditPageData(id, session.user.id, session.user.role);
  } catch {
    notFound();
  }

  return (
    <div className="page-shell max-w-3xl">
      <EditBeatForm
        beat={serializeLean(data.beat)}
        licenses={serializeLean(data.licenses)}
      />
    </div>
  );
}
