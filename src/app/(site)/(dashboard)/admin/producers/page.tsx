import { adminService } from "@/lib/services/admin.service";
import AdminProducersClient from "./AdminProducersClient";

export const dynamic = "force-dynamic";

export default async function AdminProducersPage() {
  const items = await adminService.listProducersWithStats();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Producers</h1>
      <AdminProducersClient producers={items} />
    </div>
  );
}
