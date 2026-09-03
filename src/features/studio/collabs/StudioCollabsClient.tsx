"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { BeatSplitsDto } from "@/lib/serializers/collab";

export default function StudioCollabsClient() {
  const [incoming, setIncoming] = useState<BeatSplitsDto[]>([]);
  const [outgoing, setOutgoing] = useState<BeatSplitsDto[]>([]);
  const [viewerUserId, setViewerUserId] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const res = await fetch("/api/studio/collabs");
    if (!res.ok) return;
    const body = (await res.json()) as {
      incoming: BeatSplitsDto[];
      outgoing: BeatSplitsDto[];
      viewerUserId: string;
    };
    setIncoming(body.incoming);
    setOutgoing(body.outgoing);
    setViewerUserId(body.viewerUserId);
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, []);

  async function respond(beatId: string, action: "accept" | "decline") {
    const res = await fetch(`/api/studio/collabs/${beatId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const body = await res.json();
      toast.error(body.error || "Could not update invite");
      return;
    }
    toast.success(action === "accept" ? "Invite accepted" : "Invite declined");
    await load();
  }

  const pendingIncoming = incoming.filter((item) =>
    item.collaborators.some(
      (collaborator) =>
        collaborator.userId === viewerUserId && collaborator.status === "pending"
    )
  );

  return (
    <div className="page-shell max-w-4xl">
      <div className="page-header">
        <h1 className="page-title">Collaborators</h1>
        <p className="text-muted-foreground">
          Accept split invites and track active collabs. Payouts stay in your own balance.
        </p>
      </div>

      <Card className="mb-6 rounded-2xl border-border/50 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-primary" />
            Invites for you
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : pendingIncoming.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pending invites.</p>
          ) : (
            <ul className="space-y-3">
              {pendingIncoming.map((item) => {
                const mine = item.collaborators.find(
                  (collaborator) => collaborator.userId === viewerUserId
                );
                return (
                  <li
                    key={item.beatId}
                    className="flex flex-col gap-3 rounded-xl border border-border/50 p-4 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <Link href={`/beats/${item.beatId}`} className="font-medium hover:text-primary">
                        {item.beatTitle}
                      </Link>
                      <p className="text-sm text-muted-foreground">
                        Your share {mine?.sharePercent ?? "—"}% · owner {item.ownerSharePercent}%
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => respond(item.beatId, "accept")}>
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => respond(item.beatId, "decline")}
                      >
                        Decline
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border-border/50 bg-card/80 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Your outgoing splits</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : outgoing.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Invite collaborators from a beat’s edit page.
            </p>
          ) : (
            <ul className="space-y-3">
              {outgoing.map((item) => (
                <li key={item.beatId} className="rounded-xl border border-border/50 p-4">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <Link
                      href={`/studio/beats/${item.beatId}/edit`}
                      className="font-medium hover:text-primary"
                    >
                      {item.beatTitle}
                    </Link>
                    <Badge variant="outline">{item.splitsStatus}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    You {item.ownerSharePercent}%
                    {item.collaborators.map((collaborator) => (
                      <span key={collaborator.userId}>
                        {" · "}@{collaborator.username} {collaborator.sharePercent}% ({collaborator.status})
                      </span>
                    ))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
