import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { featuredService } from "@/lib/services/featured.service";
import FeaturedAdminClient from "./FeaturedAdminClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Admin — Featured Beats",
};

export default async function AdminFeaturedPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/login");

  const entries = await featuredService.listWithBeatTitles();

  return (
    <div className="page-shell">
      <h1 className="mb-6 text-2xl font-semibold">Featured Beats</h1>
      <FeaturedAdminClient entries={entries} />
    </div>
  );
}
