"use client";

import { Badge } from "@/components/ui/badge";
import type { HydratedCollaborator } from "@/lib/serializers/collab";

export function CollaboratorStatusList({
  collaborators,
}: {
  collaborators: HydratedCollaborator[];
}) {
  if (collaborators.length === 0) return null;

  return (
    <ul className="space-y-2 text-sm">
      {collaborators.map((collaborator) => {
        const label =
          collaborator.status === "accepted"
            ? "Accepted"
            : collaborator.status === "declined"
              ? "Declined"
              : "Pending";
        return (
          <li key={collaborator.userId} className="flex items-center justify-between">
            <span>
              @{collaborator.username || "unknown"} · {collaborator.sharePercent}%
            </span>
            <Badge variant="outline">{label}</Badge>
          </li>
        );
      })}
    </ul>
  );
}
