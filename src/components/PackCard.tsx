"use client";

import Image from "next/image";
import Link from "next/link";
import { PackageOpen, Music } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface PackCardProps {
  pack: {
    _id: string;
    title: string;
    slug: string;
    coverImages: string[];
    genre: string;
    beatCount: number;
    startingPrice: number | null;
    producerName: string;
    producerUsername?: string;
    salesCount?: number;
  };
  priority?: boolean;
}

export default function PackCard({ pack, priority = false }: PackCardProps) {
  const coverUrl = pack.coverImages?.[0];

  return (
    <div className="group w-full bg-transparent">
      <Link
        href={`/beat-packs/${pack.slug}`}
        className="relative block aspect-square w-full overflow-hidden rounded-xl"
      >
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt={pack.title}
            fill
            sizes="(max-width:640px)50vw,(max-width:1024px)33vw,20vw"
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <PackageOpen className="h-10 w-10 text-muted-foreground" />
          </div>
        )}

        <div className="absolute left-3 top-3 z-10">
          <Badge className="rounded-full bg-primary/90 px-2.5 py-0.5 text-[10px] font-semibold text-primary-foreground shadow backdrop-blur-sm">
            <PackageOpen className="mr-1 h-3 w-3" />
            {pack.beatCount} beats
          </Badge>
        </div>
      </Link>

      <div className="space-y-2 pt-3">
        <Link href={`/beat-packs/${pack.slug}`} className="block">
          <div className="flex items-center justify-between">
            <Badge
              variant="secondary"
              className="rounded-md border border-primary/50 bg-transparent text-xs text-primary"
            >
              <Music className="mr-1 h-3 w-3" />
              {pack.genre}
            </Badge>
            {pack.startingPrice !== null && (
              <span className="text-sm font-medium text-red-500">
                from ₹{pack.startingPrice.toLocaleString("en-IN")}
              </span>
            )}
          </div>

          <h3 className="mt-1 truncate text-lg font-semibold text-foreground transition-colors duration-300 group-hover:text-primary">
            {pack.title}
          </h3>
        </Link>

        {pack.producerUsername ? (
          <Link
            href={`/producer/${pack.producerUsername}`}
            className="block w-fit truncate text-base text-muted-foreground hover:text-primary hover:underline"
          >
            {pack.producerName}
          </Link>
        ) : (
          <p className="truncate text-base text-muted-foreground">
            {pack.producerName}
          </p>
        )}
      </div>
    </div>
  );
}
