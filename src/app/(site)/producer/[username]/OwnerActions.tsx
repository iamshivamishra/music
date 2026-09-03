"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import EmbedCodeGenerator from "@/components/EmbedCodeGenerator";
import { isFeatureEnabled } from "@/lib/feature-flags";

function useIsOwner(producerId: string): boolean {
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((session) => {
        if (session?.user?.id === producerId) {
          setIsOwner(true);
        }
      })
      .catch(() => {});
  }, [producerId]);

  return isOwner;
}

interface OwnerActionsProps {
  producerId: string;
  salesCount: number;
  username: string;
}

export default function OwnerActions({
  producerId,
  salesCount,
  username,
}: OwnerActionsProps) {
  const isOwner = useIsOwner(producerId);

  if (!isOwner) return null;

  return (
    <>
      <div>
        <p className="text-xl font-bold">{salesCount}</p>
        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          <ShoppingBag className="h-3 w-3" /> Sales
        </p>
      </div>
      <div className="absolute right-0 top-0 flex flex-wrap items-center justify-end gap-2 sm:static">
        <EmbedCodeGenerator
          beatTitle={username}
          username={username}
        />
        {isFeatureEnabled("linkInBioStore") && (
          <Button asChild variant="outline" size="sm" className="shrink-0">
            <Link href="/studio/store">Edit store</Link>
          </Button>
        )}
        <Button asChild variant="outline" size="sm" className="shrink-0">
          <Link href="/profile/edit">Edit Profile</Link>
        </Button>
      </div>
    </>
  );
}

export function OwnerEmptyHint({ producerId }: { producerId: string }) {
  const isOwner = useIsOwner(producerId);
  if (!isOwner) return null;

  return (
    <p className="mt-2 text-sm">
      Uploading soon.{" "}
      <Link href="/upload" className="font-medium text-primary underline-offset-4 hover:underline">
        Upload your first beat
      </Link>
    </p>
  );
}
