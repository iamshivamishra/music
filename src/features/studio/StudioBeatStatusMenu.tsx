"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Archive,
  Copy,
  Eye,
  EyeOff,
  Link2,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SchedulePublishDialog } from "@/features/studio/SchedulePublishDialog";
import { copyPrivateBeatLink } from "@/lib/beats/private-link";
import { istDatetimeLocalToUtc } from "@/lib/datetime/ist";
import { isFeatureEnabled } from "@/lib/feature-flags";
import { toast } from "sonner";
import type { BeatStatus, IBeat } from "@/types";

interface Props {
  beat: IBeat;
  loading: boolean;
  onStatus: (
    beatId: string,
    body: { status?: BeatStatus; publishAt?: string; rotateToken?: boolean }
  ) => Promise<void>;
  onDelete: (beatId: string, title: string) => Promise<void>;
}

export function StudioBeatStatusMenu({ beat, loading, onStatus, onDelete }: Props) {
  const router = useRouter();
  const beatId = beat._id.toString();
  const privateDrops = isFeatureEnabled("privateDrops");
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [unlistScheduleOpen, setUnlistScheduleOpen] = useState(false);

  const copyLink = async () => {
    if (!beat.privateToken) {
      toast.error("No private link yet — unlist the beat first");
      return;
    }
    const ok = await copyPrivateBeatLink(beatId, beat.privateToken);
    toast[ok ? "success" : "error"](ok ? "Private link copied" : "Could not copy link");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={loading}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={`Actions for ${beat.title}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(`/studio/beats/${beatId}/edit`)}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit
          </DropdownMenuItem>
          {beat.status === "published" && (
            <DropdownMenuItem onClick={() => router.push(`/beats/${beatId}`)}>
              <Eye className="mr-2 h-4 w-4" />
              View Public
            </DropdownMenuItem>
          )}
          {beat.status === "unlisted" && (
            <DropdownMenuItem onClick={copyLink}>
              <Copy className="mr-2 h-4 w-4" />
              Copy private link
            </DropdownMenuItem>
          )}
          {beat.status === "unlisted" && (
            <DropdownMenuItem onClick={() => onStatus(beatId, { rotateToken: true })}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reset link
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          {beat.status !== "published" && (
            <DropdownMenuItem onClick={() => onStatus(beatId, { status: "published" })}>
              <Eye className="mr-2 h-4 w-4" />
              Publish now
            </DropdownMenuItem>
          )}
          {privateDrops && beat.status !== "unlisted" && (
            <DropdownMenuItem onClick={() => onStatus(beatId, { status: "unlisted" })}>
              <Link2 className="mr-2 h-4 w-4" />
              Unlist
            </DropdownMenuItem>
          )}
          {privateDrops && beat.status === "unlisted" && (
            <DropdownMenuItem onClick={() => setUnlistScheduleOpen(true)}>
              <Link2 className="mr-2 h-4 w-4" />
              Set go-live time
            </DropdownMenuItem>
          )}
          {privateDrops && beat.status !== "scheduled" && beat.status !== "unlisted" && (
            <DropdownMenuItem onClick={() => setScheduleOpen(true)}>
              <EyeOff className="mr-2 h-4 w-4" />
              Schedule
            </DropdownMenuItem>
          )}
          {beat.status === "published" && (
            <DropdownMenuItem onClick={() => onStatus(beatId, { status: "draft" })}>
              <EyeOff className="mr-2 h-4 w-4" />
              Unpublish
            </DropdownMenuItem>
          )}
          {beat.status !== "archived" && (
            <DropdownMenuItem onClick={() => onStatus(beatId, { status: "archived" })}>
              <Archive className="mr-2 h-4 w-4" />
              Archive
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-destructive focus:text-destructive"
            onClick={() => onDelete(beatId, beat.title)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SchedulePublishDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        initialValue={beat.publishAt}
        onConfirm={(local) =>
          onStatus(beatId, {
            status: "scheduled",
            publishAt: istDatetimeLocalToUtc(local).toISOString(),
          })
        }
      />
      <SchedulePublishDialog
        open={unlistScheduleOpen}
        onOpenChange={setUnlistScheduleOpen}
        title="Go live automatically"
        description="Keep the private link. The beat publishes at this time."
        confirmLabel="Save"
        initialValue={beat.publishAt}
        onConfirm={(local) =>
          onStatus(beatId, {
            status: "unlisted",
            publishAt: istDatetimeLocalToUtc(local).toISOString(),
          })
        }
      />
    </>
  );
}
