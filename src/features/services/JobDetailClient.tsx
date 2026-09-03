"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { JobStatusBadge } from "@/features/services/JobStatusBadge";
import { JobDeliveryUpload } from "@/features/services/JobDeliveryUpload";
import { openServiceRazorpayCheckout } from "@/features/payments/openServiceRazorpayCheckout";
import { MAX_REVISIONS } from "@/lib/validators/service-job";
import type { ServiceJobDetailDto } from "@/lib/serializers/service-job";

interface Props {
  job: ServiceJobDetailDto;
  role: "producer" | "buyer";
}

async function postJob(path: string): Promise<Response> {
  return fetch(path, { method: "POST" });
}

export default function JobDetailClient({ job, role }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = () => router.refresh();

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(null);
    }
  };

  const accept = () =>
    run("accept", async () => {
      const res = await postJob(`/api/service-jobs/${job.id}/accept`);
      if (!res.ok) throw new Error((await res.json()).error || "Could not accept");
      toast.success("Job accepted");
      refresh();
    });

  const decline = () =>
    run("decline", async () => {
      if (!confirm("Decline this job and refund the deposit?")) return;
      const res = await postJob(`/api/service-jobs/${job.id}/decline`);
      if (!res.ok) throw new Error((await res.json()).error || "Could not decline");
      toast.success("Job declined and deposit refunded");
      refresh();
    });

  const payBalance = () =>
    run("balance", async () => {
      const res = await postJob(`/api/service-jobs/${job.id}/balance`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Could not start balance payment");
      await openServiceRazorpayCheckout({
        orderId: data.orderId,
        amount: data.amount,
        description: `Balance for ${job.listingTitle}`,
        onSuccess: () => {
          toast.success("Balance paid");
          refresh();
        },
      });
    });

  const requestRevision = () =>
    run("revision", async () => {
      const res = await postJob(`/api/service-jobs/${job.id}/revision`);
      if (!res.ok) throw new Error((await res.json()).error || "Could not request revision");
      toast.success("Revision requested");
      refresh();
    });

  const complete = () =>
    run("complete", async () => {
      const res = await postJob(`/api/service-jobs/${job.id}/complete`);
      if (!res.ok) throw new Error((await res.json()).error || "Could not complete");
      toast.success("Job completed");
      refresh();
    });

  const dispute = () =>
    run("dispute", async () => {
      if (!confirm("Open a dispute? We'll email support. SLA is 5 business days.")) return;
      const res = await postJob(`/api/service-jobs/${job.id}/dispute`);
      if (!res.ok) throw new Error((await res.json()).error || "Could not open dispute");
      toast.success("Dispute opened");
      refresh();
    });

  const download = () =>
    run("download", async () => {
      const res = await fetch(`/api/service-jobs/${job.id}/download`);
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Download unavailable");
      window.location.href = data.url;
    });

  const hoursLeft =
    job.acceptBy && job.status === "awaiting_acceptance"
      ? Math.max(0, (new Date(job.acceptBy).getTime() - Date.now()) / 36e5)
      : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="page-title">{job.listingTitle}</h1>
        <JobStatusBadge status={job.status} />
      </div>

      {hoursLeft !== null && (
        <p className="text-sm text-muted-foreground">
          Accept within {hoursLeft < 1 ? "less than an hour" : `${Math.ceil(hoursLeft)} hours`} or the
          deposit is refunded automatically.
        </p>
      )}

      <dl className="grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-xl border border-border/50 bg-card/80 p-4">
          <dt className="text-muted-foreground">Quoted total</dt>
          <dd className="mt-1 font-semibold">₹{job.quotedTotal.toLocaleString("en-IN")}</dd>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/80 p-4">
          <dt className="text-muted-foreground">Deposit</dt>
          <dd className="mt-1 font-semibold">₹{job.depositAmount.toLocaleString("en-IN")}</dd>
        </div>
        <div className="rounded-xl border border-border/50 bg-card/80 p-4">
          <dt className="text-muted-foreground">Balance</dt>
          <dd className="mt-1 font-semibold">₹{job.balanceAmount.toLocaleString("en-IN")}</dd>
        </div>
      </dl>

      <div className="rounded-xl border border-border/50 bg-card/80 p-4 text-sm">
        <p className="font-medium">Brief</p>
        <p className="mt-2 whitespace-pre-wrap text-muted-foreground">{job.brief.notes}</p>
        {job.brief.referencesUrl && (
          <a
            href={job.brief.referencesUrl}
            className="mt-2 inline-block text-primary hover:underline"
            target="_blank"
            rel="noopener noreferrer"
          >
            Reference link
          </a>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {role === "producer" && job.status === "awaiting_acceptance" && (
          <>
            <Button onClick={accept} disabled={busy !== null}>
              {busy === "accept" && <Loader2 className="h-4 w-4 animate-spin" />}
              Accept
            </Button>
            <Button variant="destructive" onClick={decline} disabled={busy !== null}>
              Decline & refund
            </Button>
          </>
        )}

        {role === "producer" &&
          (job.status === "in_progress" || job.status === "revision_requested") && (
            <JobDeliveryUpload
              jobId={job.id}
              busy={busy !== null}
              uploading={busy === "upload"}
              onBusy={(fn) => run("upload", fn)}
              onComplete={refresh}
            />
          )}

        {role === "buyer" && job.balanceAmount > 0 && !job.balancePaid && job.hasDelivery && (
          <Button onClick={payBalance} disabled={busy !== null}>
            {busy === "balance" && <Loader2 className="h-4 w-4 animate-spin" />}
            Pay remaining ₹{job.balanceAmount.toLocaleString("en-IN")}
          </Button>
        )}

        {(job.unlocked || role === "producer") && job.hasDelivery && (
          <Button variant="outline" onClick={download} disabled={busy !== null}>
            {busy === "download" && <Loader2 className="h-4 w-4 animate-spin" />}
            Download files
          </Button>
        )}

        {role === "buyer" && job.status === "delivered" && job.unlocked && (
          <>
            {job.revisionCount < MAX_REVISIONS && (
              <Button variant="outline" onClick={requestRevision} disabled={busy !== null}>
                Request revision ({MAX_REVISIONS - job.revisionCount} left)
              </Button>
            )}
            <Button onClick={complete} disabled={busy !== null}>
              Accept delivery
            </Button>
          </>
        )}

        {job.status !== "completed" &&
          job.status !== "cancelled" &&
          job.status !== "pending_deposit" && (
            <Button variant="outline" onClick={dispute} disabled={busy !== null}>
              Dispute
            </Button>
          )}
      </div>
    </div>
  );
}
