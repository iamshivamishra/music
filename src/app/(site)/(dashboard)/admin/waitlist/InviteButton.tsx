"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function InviteButton({ entryId }: { entryId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [invited, setInvited] = useState(false);
  const [error, setError] = useState("");

  const handleInvite = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/waitlist/${entryId}/invite`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setInvited(true);
        router.refresh();
      } else {
        setError(data.error || "Failed to send invitation");
      }
    } catch {
      setError("Failed to send invitation");
    } finally {
      setLoading(false);
    }
  };

  if (invited) {
    return (
      <span className="text-xs font-medium text-success-text">Invited</span>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button
        variant="outline"
        size="sm"
        disabled={loading}
        onClick={handleInvite}
        aria-label="Invite producer"
      >
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <>
            <Send className="mr-1.5 h-3.5 w-3.5" />
            Invite
          </>
        )}
      </Button>
      {error && (
        <p role="alert" className="max-w-[12rem] text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
