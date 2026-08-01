"use client";

import * as React from "react";
import { Switch as Primitive } from "radix-ui";
import { cn } from "./utils";

function Switch({
  className,
  ...props
}: React.ComponentProps<typeof Primitive.Root>) {
  return (
    <Primitive.Root
      data-slot="switch"
      className={cn(
        "group inline-flex h-6 w-11 shrink-0 items-center border-2 border-border bg-muted outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 data-checked:bg-primary",
        className,
      )}
      {...props}
    >
      <Primitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-4 translate-x-0.5 bg-foreground transition-transform group-data-checked:translate-x-5 group-data-checked:bg-primary-foreground"
      />
    </Primitive.Root>
  );
}

export { Switch };
