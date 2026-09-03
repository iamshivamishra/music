import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  icon: ReactNode;
  label: string;
  value: string | number;
  description?: string;
  className?: string;
}

export function StatCard({ icon, label, value, description, className }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/50 bg-card/70 p-4 backdrop-blur-sm",
        className
      )}
    >
      <div className="flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      {description && (
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
}
