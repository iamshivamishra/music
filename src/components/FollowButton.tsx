"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface FollowButtonProps {
  producerId: string;
  initialIsFollowing?: boolean;
  isLoggedIn?: boolean;
}

export default function FollowButton({
  producerId,
  initialIsFollowing,
  isLoggedIn: initialIsLoggedIn,
}: FollowButtonProps) {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing ?? false);
  const [isLoggedIn, setIsLoggedIn] = useState(initialIsLoggedIn ?? false);
  const [isReady, setIsReady] = useState(
    initialIsFollowing !== undefined && initialIsLoggedIn !== undefined
  );
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    if (isReady) return;
    fetch(`/api/producers/${producerId}/follow/status`, { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setIsFollowing(data.isFollowing);
          setIsLoggedIn(data.isLoggedIn);
        }
        setIsReady(true);
      })
      .catch(() => {
        toast.error("Could not load follow status");
        setIsReady(true);
      });
  }, [producerId, isReady]);

  const handleClick = () => {
    // Not logged in -> send to login instead of calling the API
    if (!isLoggedIn) {
      router.push(`/login?callbackUrl=/producer/${producerId}`);
      return;
    }

    const previousState = isFollowing;
    setIsFollowing(!previousState); // optimistic update

    startTransition(async () => {
      try {
        const res = await fetch(`/api/producers/${producerId}/follow`, {
          method: previousState ? "DELETE" : "POST",
        });

        if (!res.ok) {
          throw new Error("Follow request failed");
        }

        router.refresh(); // sync followers count shown on the page
      } catch (err) {
        // Revert optimistic update on failure
        setIsFollowing(previousState);
        toast.error("Follow action failed. Please try again.");
        console.error("Follow toggle failed:", err);
      }
    });
  };

  if (!isReady) {
    return (
      <Button variant="outline" size="sm" className="shrink-0" disabled>
        <UserPlus className="mr-1.5 h-4 w-4" />
        Follow
      </Button>
    );
  }

  return (
    <Button
      onClick={handleClick}
      disabled={isPending}
      variant={isFollowing ? "outline" : "default"}
      size="sm"
      className="shrink-0"
    >
      {isFollowing ? (
        <>
          <UserCheck className="mr-1.5 h-4 w-4" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="mr-1.5 h-4 w-4" />
          Follow
        </>
      )}
    </Button>
  );
}