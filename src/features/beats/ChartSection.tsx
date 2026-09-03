import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface ChartSectionProps {
  id: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  children: ReactNode;
}

export default function ChartSection({
  id,
  icon: Icon,
  title,
  subtitle,
  children,
}: ChartSectionProps) {
  return (
    <section aria-labelledby={id} className="mt-16">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 id={id} className="text-2xl font-semibold">
            {title}
          </h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
