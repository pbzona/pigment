"use client";

import * as React from "react";
import { Tooltip as Primitive } from "radix-ui";
import { cn } from "./utils";

function TooltipProvider({
  delayDuration = 150,
  ...props
}: React.ComponentProps<typeof Primitive.Provider>) {
  return <Primitive.Provider delayDuration={delayDuration} {...props} />;
}
function Tooltip(props: React.ComponentProps<typeof Primitive.Root>) {
  return <Primitive.Root data-slot="tooltip" {...props} />;
}
function TooltipTrigger(props: React.ComponentProps<typeof Primitive.Trigger>) {
  return <Primitive.Trigger data-slot="tooltip-trigger" {...props} />;
}
function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof Primitive.Content>) {
  return (
    <Primitive.Portal>
      <Primitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          "z-50 max-w-xs border-2 border-border bg-foreground px-3 py-1.5 font-mono text-xs font-bold text-background shadow-[3px_3px_0_var(--primary)]",
          className,
        )}
        {...props}
      >
        {children}
        <Primitive.Arrow className="fill-foreground" />
      </Primitive.Content>
    </Primitive.Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
