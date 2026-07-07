import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Drafting-tag badges: mono type, square corners with one clipped
 * corner, tinted paper fills with ink-adjacent borders.
 */
const badgeVariants = cva(
  "inline-flex items-center justify-center border px-2 py-0.5 font-mono text-[10px] font-medium tracking-wide uppercase w-fit whitespace-nowrap shrink-0 gap-1 transition-colors [clip-path:polygon(0_0,calc(100%-7px)_0,100%_7px,100%_100%,0_100%)]",
  {
    variants: {
      variant: {
        default: "border-indigo-700/40 bg-indigo-600/8 text-indigo-800",
        purple: "border-violet-700/40 bg-violet-600/8 text-violet-800",
        cyan: "border-sky-700/40 bg-sky-600/8 text-sky-800",
        emerald: "border-teal-700/40 bg-teal-600/8 text-teal-800",
        amber: "border-amber-700/45 bg-amber-500/10 text-amber-800",
        outline: "border-ink/25 bg-ink/4 text-muted-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
