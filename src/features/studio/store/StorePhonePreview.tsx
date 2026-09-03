"use client";

import type { StoreEditorBeat, StoreEditorPack } from "@/lib/serializers/store";

interface StorePhonePreviewProps {
  displayName: string;
  username?: string;
  avatarUrl?: string;
  headline: string;
  showWhatsApp: boolean;
  hasWhatsApp: boolean;
  pinnedBeats: StoreEditorBeat[];
  featuredPack: StoreEditorPack | null;
}

export default function StorePhonePreview({
  displayName,
  username,
  avatarUrl,
  headline,
  showWhatsApp,
  hasWhatsApp,
  pinnedBeats,
  featuredPack,
}: StorePhonePreviewProps) {
  return (
    <div className="mx-auto w-[280px] rounded-[2rem] border border-border bg-background p-3 shadow-lg">
      <div className="rounded-[1.4rem] border border-border/60 bg-card p-4">
        <div className="flex flex-col items-center text-center">
          {avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={avatarUrl}
              alt=""
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/20 text-lg font-semibold text-primary">
              {displayName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <p className="mt-2 text-sm font-semibold">{displayName}</p>
          {username && (
            <p className="text-xs text-muted-foreground">@{username}</p>
          )}
          {headline ? (
            <p className="mt-1 line-clamp-2 text-xs">{headline}</p>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">Your headline</p>
          )}
          <div className="mt-3 flex flex-wrap justify-center gap-1">
            <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] text-primary-foreground">
              Follow
            </span>
            {showWhatsApp && hasWhatsApp && (
              <span className="rounded-full border border-border px-2 py-0.5 text-[10px]">
                WhatsApp
              </span>
            )}
            <span className="rounded-full border border-border px-2 py-0.5 text-[10px]">
              Share
            </span>
          </div>
        </div>

        {pinnedBeats.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Pinned
            </p>
            <div className="space-y-1.5">
              {pinnedBeats.map((beat) => (
                <div key={beat._id} className="flex items-center gap-2">
                  {beat.coverUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={beat.coverUrl} alt="" className="h-8 w-8 rounded object-cover" />
                  ) : (
                    <div className="h-8 w-8 rounded bg-muted" />
                  )}
                  <p className="truncate text-xs">{beat.title}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {featuredPack && (
          <div className="mt-4">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              Pack
            </p>
            <p className="truncate text-xs font-medium">{featuredPack.title}</p>
          </div>
        )}
      </div>
    </div>
  );
}
