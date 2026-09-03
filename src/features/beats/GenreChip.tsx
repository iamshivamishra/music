import Link from "next/link";
import { Chip } from "@/components/ui/chip";
import { beatsHref } from "@/features/beats/beats-query";

interface GenreChipProps {
  genre: string;
  active?: boolean;
}

export function GenreChip({ genre, active = false }: GenreChipProps) {
  return (
    <Chip asChild variant={active ? "solid" : "muted"}>
      <Link
        href={beatsHref({}, { genre })}
        aria-current={active ? "page" : undefined}
      >
        {genre}
      </Link>
    </Chip>
  );
}
