"use client";

import * as React from "react";
import { ScrollArea as Primitive } from "radix-ui";
import { cn } from "./utils";

function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof Primitive.Root>) {
  return (
    <Primitive.Root
      data-slot="scroll-area"
      className={cn("relative min-h-0 min-w-0 overflow-hidden", className)}
      {...props}
    >
      <Primitive.Viewport
        data-slot="scroll-area-viewport"
        className="size-full min-h-0 min-w-0 overscroll-contain outline-none focus-visible:ring-2 focus-visible:ring-ring [&>div]:!block [&>div]:!min-w-0 [&>div]:!w-full"
      >
        {children}
      </Primitive.Viewport>
      <ScrollBar />
      <Primitive.Corner />
    </Primitive.Root>
  );
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof Primitive.Scrollbar>) {
  return (
    <Primitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none border-border bg-background p-px data-horizontal:h-3 data-horizontal:flex-col data-horizontal:border-t-2 data-vertical:h-full data-vertical:w-3 data-vertical:border-l-2",
        className,
      )}
      {...props}
    >
      <Primitive.Thumb className="relative flex-1 bg-muted-foreground" />
    </Primitive.Scrollbar>
  );
}

export { ScrollArea, ScrollBar };
