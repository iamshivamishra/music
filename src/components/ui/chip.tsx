import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const chipVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1.5 rounded-full font-medium whitespace-nowrap transition-colors select-none outline-none focus-visible:ring-2 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        muted:
          "bg-secondary text-secondary-foreground hover:bg-primary hover:text-primary-foreground",
        outline:
          "border border-border/50 bg-card text-foreground hover:border-transparent hover:bg-primary hover:text-primary-foreground",
        solid: "bg-primary text-primary-foreground hover:brightness-110",
      },
      size: {
        sm: "h-9 px-3.5 text-xs",
        default: "h-11 px-5 text-sm",
      },
    },
    defaultVariants: {
      variant: "muted",
      size: "default",
    },
  },
);

function Chip({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof chipVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="chip"
      className={cn(chipVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Chip, chipVariants };
