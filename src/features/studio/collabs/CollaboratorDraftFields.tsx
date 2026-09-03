"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface CollaboratorDraft {
  username: string;
  sharePercent: string;
}

interface CollaboratorDraftFieldsProps {
  drafts: CollaboratorDraft[];
  onDraftsChange: (drafts: CollaboratorDraft[]) => void;
}

export function CollaboratorDraftFields({
  drafts,
  onDraftsChange,
}: CollaboratorDraftFieldsProps) {
  return (
    <>
      {drafts.map((draft, index) => (
        <div key={`${draft.username}-${index}`} className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor={`collab-user-${index}`}>Collaborator username</Label>
            <Input
              id={`collab-user-${index}`}
              value={draft.username}
              onChange={(event) => {
                const value = event.target.value;
                onDraftsChange(
                  drafts.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, username: value } : row
                  )
                );
              }}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`collab-share-${index}`}>Their share %</Label>
            <Input
              id={`collab-share-${index}`}
              inputMode="numeric"
              value={draft.sharePercent}
              onChange={(event) => {
                const value = event.target.value;
                onDraftsChange(
                  drafts.map((row, rowIndex) =>
                    rowIndex === index ? { ...row, sharePercent: value } : row
                  )
                );
              }}
            />
          </div>
        </div>
      ))}

      {drafts.length < 2 && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            onDraftsChange([...drafts, { username: "", sharePercent: "10" }])
          }
        >
          Add another collaborator
        </Button>
      )}
    </>
  );
}
