import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * Drafting-press buttons: hairline ink borders and a hard offset shadow
 * that the button "pushes into" on hover — no soft glows, no gradients.
 */
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-sm text-sm font-medium transition-all duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-ring/50 cursor-pointer active:translate-x-[3px] active:translate-y-[3px] active:shadow-none",
  {
    variants: {
      variant: {
        default:
          "border border-ink bg-primary text-primary-foreground shadow-[3px_3px_0_#24344d] hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:shadow-[1.5px_1.5px_0_#24344d]",
        secondary:
          "border border-ink/70 bg-card text-foreground shadow-[3px_3px_0_rgba(36,52,77,0.35)] hover:translate-x-[1.5px] hover:translate-y-[1.5px] hover:shadow-[1.5px_1.5px_0_rgba(36,52,77,0.35)]",
        ghost:
          "text-muted-foreground hover:bg-ink/5 hover:text-foreground active:translate-x-0 active:translate-y-0",
        outline:
          "border border-ink/40 bg-transparent text-foreground hover:border-ink hover:bg-card active:translate-x-0 active:translate-y-0",
        destructive:
          "border border-destructive/60 bg-destructive/10 text-destructive hover:bg-destructive/20 active:translate-x-0 active:translate-y-0",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-sm px-3 text-xs",
        lg: "h-11 rounded-sm px-6",
        icon: "size-9",
        iconSm: "size-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
