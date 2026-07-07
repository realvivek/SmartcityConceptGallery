import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium tracking-wide w-fit whitespace-nowrap shrink-0 gap-1 transition-colors",
  {
    variants: {
      variant: {
        default: "border-primary/30 bg-primary/10 text-blue-300",
        purple: "border-accent/30 bg-accent/10 text-purple-300",
        cyan: "border-cyan-400/30 bg-cyan-400/10 text-cyan-300",
        emerald: "border-emerald-400/30 bg-emerald-400/10 text-emerald-300",
        amber: "border-amber-400/30 bg-amber-400/10 text-amber-300",
        outline: "border-white/15 bg-white/5 text-muted-foreground",
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
