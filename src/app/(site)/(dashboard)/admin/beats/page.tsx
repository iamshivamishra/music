import Image from "next/image";
import { adminService } from "@/lib/services/admin.service";
import { DeleteBeatButton } from "./DeleteBeatButton";

export const dynamic = "force-dynamic";

export default async function AdminBeatsPage() {
  const beats = await adminService.listBeats(1, 50);

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Beats</h1>
      <div className="overflow-x-auto rounded-xl border border-border/50">
        <table className="w-full text-sm">
          <thead className="bg-admin-bg text-left text-admin-muted">
            <tr>
              <th className="p-3">Cover</th>
              <th className="p-3">Title</th>
              <th className="p-3">Producer</th>
              <th className="p-3">Genre</th>
              <th className="p-3">Plays</th>
              <th className="p-3">Status</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {beats.map((b) => (
              <tr key={b._id} className="border-t border-border/30">
                <td className="p-3">
                  {b.coverUrl && (
                    <Image src={b.coverUrl} alt={b.title} width={36} height={36} className="rounded object-cover" />
                  )}
                </td>
                <td className="p-3">{b.title}</td>
                <td className="p-3 text-admin-muted">{b.producerName}</td>
                <td className="p-3 text-admin-muted">{b.genre}</td>
                <td className="p-3 text-admin-muted">{b.plays}</td>
                <td className="p-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      b.isPublished ? "bg-success-bg text-success-text" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {b.status}
                  </span>
                </td>
                <td className="p-3">
                  <DeleteBeatButton beatId={b._id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
