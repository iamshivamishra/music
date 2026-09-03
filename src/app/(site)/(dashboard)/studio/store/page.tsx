import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { requireFeaturePage } from "@/lib/require-feature-page";
import { storeService } from "@/lib/services/store.service";
import { getAppUrl } from "@/lib/app-url";
import { appendSrc } from "@/lib/attribution";
import StoreEditorClient from "@/features/studio/store/StoreEditorClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Studio — Store" };

export default async function StudioStorePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "producer" && session.user.role !== "admin") {
    redirect("/");
  }
  requireFeaturePage("linkInBioStore");

  const data = await storeService.getEditorData(session.user.id);
  const bioLink = data.producer.username
    ? appendSrc(`${getAppUrl()}/p/${data.producer.username}`, "profile")
    : "";

  return (
    <div className="page-shell">
      <div className="page-header">
        <h1 className="page-title">Store</h1>
        <p className="text-muted-foreground">
          Merchandise the page you put in your Instagram bio.
        </p>
      </div>
      <StoreEditorClient data={data} bioLink={bioLink} />
    </div>
  );
}
