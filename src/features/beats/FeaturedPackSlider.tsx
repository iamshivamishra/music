"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import PackCard from "@/components/PackCard";

interface PackForSlider {
  _id: string;
  title: string;
  slug: string;
  coverImages: string[];
  genre: string;
  beatCount: number;
  startingPrice: number | null;
  producerName: string;
  producerUsername?: string;
}

interface FeaturedPackSliderProps {
  packs: PackForSlider[];
}

export default function FeaturedPackSlider({ packs }: FeaturedPackSliderProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateScrollState();
    el.addEventListener("scroll", updateScrollState, { passive: true });
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", updateScrollState);
      ro.disconnect();
    };
  }, [updateScrollState]);

  function scroll(direction: "left" | "right") {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.querySelector(":scope > *")?.clientWidth ?? 300;
    el.scrollBy({ left: direction === "left" ? -cardWidth : cardWidth, behavior: "smooth" });
  }

  if (packs.length === 0) return null;

  return (
    <div className="relative">
      {canScrollLeft && (
        <Button
          variant="outline"
          size="icon"
          className="absolute -left-3 top-1/3 z-10 hidden h-9 w-9 rounded-full border-border/60 bg-card/90 shadow-md backdrop-blur-sm md:flex"
          onClick={() => scroll("left")}
          aria-label="Scroll packs left"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
      )}

      <div
        ref={scrollRef}
        className="scrollbar-hide -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2"
      >
        {packs.map((pack, i) => (
          <div
            key={String(pack._id)}
            className="w-[260px] flex-shrink-0 snap-start sm:w-[280px]"
          >
            <PackCard pack={pack} priority={i < 2} />
          </div>
        ))}
      </div>

      {canScrollRight && (
        <Button
          variant="outline"
          size="icon"
          className="absolute -right-3 top-1/3 z-10 hidden h-9 w-9 rounded-full border-border/60 bg-card/90 shadow-md backdrop-blur-sm md:flex"
          onClick={() => scroll("right")}
          aria-label="Scroll packs right"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
