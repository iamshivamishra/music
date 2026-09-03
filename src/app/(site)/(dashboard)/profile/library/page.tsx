import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { libraryService } from "@/lib/services/library.service";
import { libraryQuerySchema } from "@/lib/validators/library";
import LibraryClient from "@/features/profile/library/LibraryClient";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "My Library" };

interface Props {
  searchParams: Promise<{ page?: string; search?: string }>;
}

export default async function LibraryPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const params = await searchParams;
  const parsed = libraryQuerySchema.safeParse(params);
  const page = parsed.success ? parsed.data.page : 1;
  const search = parsed.success ? parsed.data.search : undefined;
  const limit = parsed.success ? parsed.data.limit : 20;

  const result = await libraryService.getLibrary(session.user.id, page, limit, search);

  return (
    <LibraryClient
      initialData={result}
      currentPage={page}
      initialSearch={search ?? ""}
    />
  );
}
