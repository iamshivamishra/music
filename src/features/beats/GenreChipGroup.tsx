import { GenreChip } from "@/features/beats/GenreChip";
import { GENRE_OPTIONS } from "@/lib/validators/beat";
import { cn } from "@/lib/utils";

export const BROWSE_GENRES = GENRE_OPTIONS.filter((genre) => genre !== "Other");

interface GenreChipGroupProps {
  genres?: readonly string[];
  activeGenre?: string;
  className?: string;
}

export function GenreChipGroup({
  genres = BROWSE_GENRES,
  activeGenre,
  className,
}: GenreChipGroupProps) {
  return (
    <nav aria-label="Genres">
      <ul className={cn("flex flex-wrap gap-2", className)}>
        {genres.map((genre) => (
          <li key={genre}>
            <GenreChip genre={genre} active={activeGenre === genre} />
          </li>
        ))}
      </ul>
    </nav>
  );
}
