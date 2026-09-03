import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { waitlistService } from "@/lib/services/waitlist.service";
import { Pagination } from "@/components/ui/Pagination";
import InviteButton from "./InviteButton";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Waitlist — Admin" };
export const dynamic = "force-dynamic";

interface Props {
  searchParams: Promise<{ page?: string }>;
}

export default async function AdminWaitlistPage({ searchParams }: Props) {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") redirect("/");

  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);
  const result = await waitlistService.listPending(page, 20);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold">Producer Waitlist</h1>
        <span className="text-sm text-admin-muted">
          {result.total} pending
        </span>
      </div>

      {result.data.length === 0 ? (
        <div className="rounded-xl border border-border/50 p-8 text-center text-muted-foreground">
          No pending waitlist entries.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/50">
          <table className="w-full text-sm">
            <thead className="bg-admin-bg text-left text-admin-muted">
              <tr>
                <th className="p-3">Name</th>
                <th className="p-3">Email</th>
                <th className="p-3">Genres</th>
                <th className="p-3">Applied</th>
                <th className="p-3">Status</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {result.data.map((entry) => (
                <tr
                  key={entry._id.toString()}
                  className="border-t border-border/30"
                >
                  <td className="p-3">{entry.name}</td>
                  <td className="p-3 text-admin-muted">{entry.email}</td>
                  <td className="p-3 text-admin-muted">
                    {entry.genres?.join(", ") || "—"}
                  </td>
                  <td className="p-3 text-admin-muted">
                    {new Date(entry.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="p-3">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {entry.status}
                    </span>
                  </td>
                  <td className="p-3">
                    {entry.status === "pending" && (
                      <InviteButton entryId={entry._id.toString()} />
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result.totalPages > 1 && (
        <div className="mt-6">
          <Pagination
            page={page}
            totalPages={result.totalPages}
            getPageUrl={(p) => `/admin/waitlist?page=${p}`}
          />
        </div>
      )}
    </div>
  );
}
