"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Toggle as TogglePrimitive } from "radix-ui";
import { cn } from "./utils";

const toggleVariants = cva(
  "inline-flex items-center justify-center gap-2 border-2 border-transparent font-mono text-sm font-bold outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 data-[state=on]:border-border data-[state=on]:bg-primary data-[state=on]:text-primary-foreground aria-checked:border-border aria-checked:bg-primary aria-checked:text-primary-foreground aria-pressed:border-border aria-pressed:bg-primary aria-pressed:text-primary-foreground [&_svg]:size-4",
  {
    variants: {
      variant: {
        default: "bg-transparent",
        outline: "border-border bg-background",
      },
      size: {
        default: "h-10 min-w-10 px-3",
        sm: "h-8 min-w-8 px-2 text-xs",
        lg: "h-12 min-w-12 px-4",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Toggle({
  className,
  variant,
  size,
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> &
  VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
