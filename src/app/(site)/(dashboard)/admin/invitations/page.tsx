import { invitationService } from "@/lib/services/invitation.service";
import { toAdminInvitation } from "@/lib/serializers/invitation";
import AdminInvitationsClient from "./AdminInvitationsClient";

export const dynamic = "force-dynamic";

export default async function AdminInvitationsPage() {
  const { data: invitations } = await invitationService.list();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Founding Invitations</h1>
      <AdminInvitationsClient invitations={invitations.map(toAdminInvitation)} />
    </div>
  );
}
