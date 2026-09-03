"use client";

import { useEffect, useState, type RefObject } from "react";

export function useCtaVisibility(ref: RefObject<HTMLElement | null>) {
  const [ctaVisible, setCtaVisible] = useState(true);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setCtaVisible(entry.isIntersecting),
      { threshold: 0.2 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);

  return ctaVisible;
}
