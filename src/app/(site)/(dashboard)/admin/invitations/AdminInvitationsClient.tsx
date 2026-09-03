"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crown, Mail, Loader2, CheckCircle2, Clock, XCircle } from "lucide-react";

interface Invitation {
  _id: string;
  email: string;
  name: string;
  status: string;
  producerTier: string;
  platformFeeOverride?: number;
  expiresAt: string;
  acceptedAt: string | null;
  createdAt: string;
}

export default function AdminInvitationsClient({
  invitations: initial,
}: {
  invitations: Invitation[];
}) {
  const [invitations, setInvitations] = useState(initial);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() || !name.trim()) return;
    setSending(true);
    setError("");
    setSuccess("");

    try {
      const res = await fetch("/api/admin/invitations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), name: name.trim() }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to send invitation");
        return;
      }

      const inv = data.invitation;
      setInvitations((prev) => [
        {
          _id: inv._id,
          email: inv.email,
          name: inv.name ?? "",
          status: inv.status,
          producerTier: inv.producerTier,
          platformFeeOverride: inv.platformFeeOverride,
          expiresAt: new Date(inv.expiresAt).toISOString(),
          acceptedAt: null,
          createdAt: new Date(inv.createdAt).toISOString(),
        },
        ...prev,
      ]);
      setEmail("");
      setName("");
      setSuccess(`Invitation sent to ${inv.email}`);
    } catch {
      setError("Failed to send invitation");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSend}
        className="flex flex-col gap-4 rounded-xl border border-border/50 bg-card/70 p-5 backdrop-blur-sm sm:flex-row sm:items-end"
      >
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="invite-name">Name</Label>
          <Input
            id="invite-name"
            placeholder="Producer name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="invite-email">Email</Label>
          <Input
            id="invite-email"
            type="email"
            placeholder="producer@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <Button type="submit" disabled={sending} className="shrink-0">
          {sending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Mail className="mr-2 h-4 w-4" />
          )}
          Send Invitation
        </Button>
      </form>

      {error && (
        <div role="alert" className="rounded-md bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          {error}
        </div>
      )}
      {success && (
        <div role="status" className="rounded-md bg-green-500/10 px-4 py-2.5 text-sm text-green-400">
          {success}
        </div>
      )}

      <div className="rounded-2xl border border-border/50 bg-card/70 backdrop-blur-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-admin-bg text-left">
                <th className="px-4 py-3 font-medium text-admin-muted">Name</th>
                <th className="px-4 py-3 font-medium text-admin-muted">Email</th>
                <th className="px-4 py-3 font-medium text-admin-muted text-center">Status</th>
                <th className="px-4 py-3 font-medium text-admin-muted text-center">Fee</th>
                <th className="px-4 py-3 font-medium text-admin-muted">Sent</th>
                <th className="px-4 py-3 font-medium text-admin-muted">Expires</th>
              </tr>
            </thead>
            <tbody>
              {invitations.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                    No invitations sent yet.
                  </td>
                </tr>
              )}
              {invitations.map((inv) => (
                <tr
                  key={inv._id}
                  className="border-b border-border/30 transition-colors hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3 font-medium">{inv.name || "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{inv.email}</td>
                  <td className="px-4 py-3 text-center">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    {typeof inv.platformFeeOverride === "number"
                      ? `${inv.platformFeeOverride}%`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(inv.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {new Date(inv.expiresAt).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case "accepted":
      return (
        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Accepted
        </Badge>
      );
    case "expired":
      return (
        <Badge variant="destructive" className="bg-destructive/20 text-destructive border-destructive/30">
          <XCircle className="mr-1 h-3 w-3" />
          Expired
        </Badge>
      );
    default:
      return (
        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
          <Clock className="mr-1 h-3 w-3" />
          Sent
        </Badge>
      );
  }
}
