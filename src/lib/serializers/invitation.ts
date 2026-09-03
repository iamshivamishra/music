import { serializeLean } from "@/lib/serializers/lean";
import type { IInvitation } from "@/types";

function toId(value: string | { toString(): string }): string {
  return typeof value === "string" ? value : value.toString();
}

export function toAdminInvitation(invitation: IInvitation) {
  return serializeLean({
    _id: toId(invitation._id),
    email: invitation.email,
    name: invitation.name ?? "",
    status: invitation.status,
    producerTier: invitation.producerTier,
    platformFeeOverride: invitation.platformFeeOverride,
    expiresAt: new Date(invitation.expiresAt).toISOString(),
    acceptedAt: invitation.acceptedAt
      ? new Date(invitation.acceptedAt).toISOString()
      : null,
    createdAt: new Date(invitation.createdAt).toISOString(),
  });
}

export type AdminInvitationDto = ReturnType<typeof toAdminInvitation>;
