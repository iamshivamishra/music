import { adminService } from "@/lib/services/admin.service";

export const dynamic = "force-dynamic";

export default async function AdminSalesPage() {
  const purchases = await adminService.listSales(1, 50);

  return (
    <div>
      <h1 className="mb-6 text-xl font-bold">Sales</h1>
      <div className="overflow-x-auto rounded-xl border border-border/50">
        <table className="w-full text-sm">
          <thead className="bg-admin-bg text-left text-admin-muted">
            <tr>
              <th className="p-3">Buyer</th>
              <th className="p-3">Beat</th>
              <th className="p-3">License</th>
              <th className="p-3">Amount</th>
              <th className="p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {purchases.map((p) => (
              <tr key={p._id} className="border-t border-border/30">
                <td className="p-3">{p.buyerName}</td>
                <td className="p-3 text-admin-muted">{p.beatTitle}</td>
                <td className="p-3 text-admin-muted capitalize">{p.licenseType}</td>
                <td className="p-3 text-red-500">₹{p.amount.toLocaleString("en-IN")}</td>
                <td className="p-3 text-admin-muted">
                  {new Date(p.createdAt).toLocaleDateString("en-IN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
