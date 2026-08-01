import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";

import { cn } from "./utils";

const buttonVariants = cva(
  "inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap border-2 border-border font-mono text-sm font-bold uppercase tracking-wide outline-none transition-[transform,box-shadow,background-color,color] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-[3px_3px_0_var(--shadow)] hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[5px_5px_0_var(--shadow)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-none",
        secondary:
          "bg-secondary text-secondary-foreground shadow-[3px_3px_0_var(--shadow)] hover:bg-accent hover:text-accent-foreground",
        outline:
          "bg-background text-foreground shadow-[3px_3px_0_var(--primary)] hover:bg-muted",
        ghost:
          "border-transparent bg-transparent hover:border-border hover:bg-muted",
        destructive:
          "bg-destructive text-destructive-foreground shadow-[3px_3px_0_var(--shadow)]",
        link: "border-transparent bg-transparent text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4",
        xs: "h-6 px-2 text-xs [&_svg]:size-3",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-6",
        icon: "size-10",
        "icon-xs": "size-6 [&_svg]:size-3",
        "icon-sm": "size-8",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Component = asChild ? Slot.Root : "button";
  return (
    <Component
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
