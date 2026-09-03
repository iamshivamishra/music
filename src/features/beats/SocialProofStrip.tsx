"use client";

import { useEffect, useRef, useState } from "react";
import { Music, Headphones, TrendingUp, Zap } from "lucide-react";

export interface SocialProofStripProps {
  beatCount: number;
  producerCount: number;
  genreCount: number;
}

function useCountUp(target: number, started: boolean, duration = 1200) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!started || target === 0) {
      if (started) setValue(target);
      return;
    }

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setValue(target);
      return;
    }

    let start: number | null = null;
    let raf: number;

    function step(timestamp: number) {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf = requestAnimationFrame(step);
    }

    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, started, duration]);

  return value;
}

function StatItem({
  label,
  target,
  icon: Icon,
  display,
  started,
}: {
  label: string;
  target: number;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  display?: string;
  started: boolean;
}) {
  const count = useCountUp(target, started);
  const shown = display ?? count.toLocaleString("en-IN");

  return (
    <div className="text-center">
      <Icon className="mx-auto mb-2 h-5 w-5 text-primary" />
      <p className="text-2xl font-bold">{shown}</p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export default function SocialProofStrip({
  beatCount,
  producerCount,
  genreCount,
}: SocialProofStripProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const stats = [
    { label: "Beats", target: beatCount, icon: Music },
    { label: "Producers", target: producerCount, icon: Headphones },
    { label: "Genres", target: genreCount, icon: TrendingUp },
    { label: "Previews", target: 0, icon: Zap, display: "Free" },
  ];

  return (
    <section className="border-b border-border/30 bg-card/30">
      <div ref={ref} className="app-container grid grid-cols-2 gap-4 py-8 sm:grid-cols-4">
        {stats.map((stat) => (
          <StatItem key={stat.label} {...stat} started={started} />
        ))}
      </div>
    </section>
  );
}
