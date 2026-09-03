import { adminService } from "@/lib/services/admin.service";
import { toggleUserVerifiedAction } from "./actions";
import RoleSelect from "./RoleSelect";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await adminService.listUsers(1, 50);

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Users</h1>
      <div className="overflow-x-auto rounded-xl border border-border/50">
        <table className="w-full text-sm">
          <thead className="bg-admin-bg text-left text-admin-muted">
            <tr>
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Verified</th>
              <th className="p-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id} className="border-t border-border/30">
                <td className="p-3">{u.name}</td>
                <td className="p-3 text-admin-muted">{u.email}</td>
                <td className="p-3">
                  <RoleSelect userId={u._id} currentRole={u.role as "buyer" | "producer" | "admin"} />
                </td>
                <td className="p-3">
                  <form action={toggleUserVerifiedAction}>
                    <input type="hidden" name="userId" value={u._id} />
                    <button
                      type="submit"
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        u.verified ? "bg-success-bg text-success-text" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {u.verified ? "Verified" : "Unverified"}
                    </button>
                  </form>
                </td>
                <td className="p-3 text-admin-muted">
                  {new Date(u.createdAt).toLocaleDateString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
